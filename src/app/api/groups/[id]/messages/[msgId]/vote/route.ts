import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, msgId } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: msg } = await db
    .from("group_messages")
    .select("id, message_type, poll_data, group_id")
    .eq("id", msgId)
    .eq("group_id", id)
    .single();

  if (!msg || msg.message_type !== "poll") {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const { option_idx } = await req.json();
  const optionCount = (msg.poll_data as { options: string[] }).options.length;
  if (typeof option_idx !== "number" || option_idx < 0 || option_idx >= optionCount) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  await db
    .from("group_poll_votes")
    .upsert({ message_id: msgId, user_id: userId, option_idx }, { onConflict: "message_id,user_id" });

  const { data: votes } = await db
    .from("group_poll_votes")
    .select("option_idx")
    .eq("message_id", msgId);

  const counts = Array(optionCount).fill(0);
  for (const v of votes ?? []) counts[v.option_idx]++;

  return NextResponse.json({ counts, my_vote: option_idx });
}
