import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only owner can invite" }, { status: 403 });
  }

  // Check member limit
  const { data: group } = await db
    .from("groups")
    .select("max_members, name")
    .eq("id", id)
    .single();

  const { count } = await db
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", id);

  if ((count ?? 0) >= (group?.max_members ?? 2)) {
    return NextResponse.json({ error: "กลุ่มเต็มแล้ว" }, { status: 400 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Check if already a member
  const { data: existingUser } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    const { data: alreadyMember } = await db
      .from("group_members")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", existingUser.id)
      .single();

    if (alreadyMember) {
      return NextResponse.json({ error: "ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว" }, { status: 400 });
    }
  }

  const { data: invite, error } = await db
    .from("group_invites")
    .insert({ group_id: id, invited_user_email: email, invited_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existingUser && group) {
    await createNotification({
      userId: existingUser.id,
      actorId: userId,
      type: "group_invite_received",
      payload: { groupId: id, groupName: group.name },
    });
  }

  return NextResponse.json({ invite }, { status: 201 });
}
