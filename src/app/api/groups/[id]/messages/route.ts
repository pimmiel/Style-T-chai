import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

interface PollData {
  options: string[];
}
interface MessageRow {
  id: string;
  message_type: string;
  poll_data: PollData | null;
  [key: string]: unknown;
}
interface PollVoteRow {
  message_id: string;
  user_id: string;
  option_idx: number;
}

async function getMembership(db: ReturnType<typeof supabaseAdmin>, groupId: string, userId: string) {
  const { data } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  if (!await getMembership(db, id, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const since = req.nextUrl.searchParams.get("since");

  let query = db
    .from("group_messages")
    .select("id, user_id, user_name, content, created_at, message_type, image_url, poll_data")
    .eq("group_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (since) query = query.gt("created_at", since);

  const { data: messages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich poll messages with vote counts + current user's vote
  const pollMsgIds = (messages ?? [])
    .filter((m: MessageRow) => m.message_type === "poll")
    .map((m: MessageRow) => m.id);

  const votesByMsg: Record<string, { counts: number[]; my_vote: number | null }> = {};
  if (pollMsgIds.length > 0) {
    const { data: allVotes } = await db
      .from("group_poll_votes")
      .select("message_id, user_id, option_idx")
      .in("message_id", pollMsgIds);

    for (const msgId of pollMsgIds) {
      const msg = (messages ?? []).find((m: MessageRow) => m.id === msgId);
      const optionCount = (msg?.poll_data as { options: string[] } | null)?.options.length ?? 0;
      const counts = Array(optionCount).fill(0);
      let my_vote: number | null = null;
      for (const v of (allVotes ?? []).filter((v: PollVoteRow) => v.message_id === msgId)) {
        if (v.option_idx < optionCount) counts[v.option_idx]++;
        if (v.user_id === session.user.id) my_vote = v.option_idx;
      }
      votesByMsg[msgId] = { counts, my_vote };
    }
  }

  const enriched = (messages ?? []).map((m: MessageRow) =>
    m.message_type === "poll"
      ? { ...m, poll_votes: votesByMsg[m.id]?.counts ?? [], my_vote: votesByMsg[m.id]?.my_vote ?? null }
      : m
  );

  // Readers count for last message
  const { data: lastMsg } = await db
    .from("group_messages")
    .select("created_at")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let readersCount = 0;
  if (lastMsg) {
    const { count } = await db
      .from("group_message_reads")
      .select("*", { count: "exact", head: true })
      .eq("group_id", id)
      .neq("user_id", session.user.id)
      .gte("last_read_at", lastMsg.created_at);
    readersCount = count ?? 0;
  }

  return NextResponse.json({ messages: enriched, readersCount });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  if (!await getMembership(db, id, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await req.json();
  const { content, message_type = "text", image_url, poll_data } = body;
  const userName = session.user.name ?? session.user.email ?? "User";

  if (message_type === "text") {
    if (!content?.trim() || content.trim().length > 500) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
  } else if (message_type === "image") {
    if (!image_url) return NextResponse.json({ error: "image_url required" }, { status: 400 });
  } else if (message_type === "poll") {
    if (!poll_data?.question?.trim() || !Array.isArray(poll_data.options) || poll_data.options.length < 2) {
      return NextResponse.json({ error: "Poll requires a question and at least 2 options" }, { status: 400 });
    }
    if (poll_data.options.length > 6) {
      return NextResponse.json({ error: "Maximum 6 options" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Invalid message_type" }, { status: 400 });
  }

  const { data: message, error } = await db
    .from("group_messages")
    .insert({
      group_id: id,
      user_id: session.user.id,
      user_name: userName,
      content: message_type === "text" ? content.trim() : (message_type === "image" ? "" : poll_data.question.trim()),
      message_type,
      image_url: message_type === "image" ? image_url : null,
      poll_data: message_type === "poll" ? {
        question: poll_data.question.trim(),
        options: poll_data.options
          .map((o: string | { text: string; image_url?: string | null }) =>
            typeof o === "string"
              ? o.trim()
              : { text: o.text?.trim() ?? "", image_url: o.image_url ?? null }
          )
          .filter((o: string | { text: string; image_url: string | null }) =>
            typeof o === "string" ? o : o.text || o.image_url
          ),
      } : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = message_type === "poll"
    ? { ...message, poll_votes: Array((message.poll_data as PollData).options.length).fill(0), my_vote: null }
    : message;

  return NextResponse.json({ message: enriched }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  if (!await getMembership(db, id, session.user.id)) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { error } = await db
    .from("group_message_reads")
    .upsert(
      { group_id: id, user_id: session.user.id, last_read_at: new Date().toISOString() },
      { onConflict: "group_id,user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
