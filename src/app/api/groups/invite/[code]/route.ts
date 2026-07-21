import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const db = supabaseAdmin();

  const { data: group } = await db
    .from("groups")
    .select("id, name, max_members")
    .eq("invite_code", code)
    .single();

  if (!group) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  const { count } = await db
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id);

  return NextResponse.json({ group, member_count: count ?? 0 });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: group } = await db
    .from("groups")
    .select("id, name, max_members, owner_id")
    .eq("invite_code", code)
    .single();

  if (!group) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  // Check already a member
  const { data: existing } = await db
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ groupId: group.id, alreadyMember: true });
  }

  // Check capacity
  const { count } = await db
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id);

  if ((count ?? 0) >= group.max_members) {
    return NextResponse.json({ error: "กลุ่มเต็มแล้ว" }, { status: 400 });
  }

  await db.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "member",
  });

  await createNotification({
    userId: group.owner_id,
    actorId: userId,
    type: "group_joined",
    payload: { groupId: group.id, groupName: group.name },
  });

  // Accept any pending email invite for this user
  const { data: user } = await db.from("users").select("email").eq("id", userId).single();
  if (user?.email) {
    await db
      .from("group_invites")
      .update({ status: "accepted" })
      .eq("group_id", group.id)
      .eq("invited_user_email", user.email)
      .eq("status", "pending");
  }

  return NextResponse.json({ groupId: group.id });
}
