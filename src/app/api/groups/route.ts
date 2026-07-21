import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const userId = session.user.id;

  // Get groups where user is owner or member
  const { data: memberships } = await db
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);

  if (groupIds.length === 0) return NextResponse.json({ groups: [] });

  const { data: groups } = await db
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  // Attach member counts
  const { data: counts } = await db
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countMap[c.group_id] = (countMap[c.group_id] ?? 0) + 1;
  }

  const enriched = (groups ?? []).map((g: { id: string; [key: string]: unknown }) => ({
    ...g,
    member_count: countMap[g.id] ?? 0,
  }));

  return NextResponse.json({ groups: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const userId = session.user.id;

  const { name, description, maxMembers } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "ต้องระบุชื่อกลุ่ม" }, { status: 400 });
  }

  const inviteCode = nanoid(10);

  const { data: group, error } = await db
    .from("groups")
    .insert({
      name: name.trim(),
      description: description?.trim() ?? null,
      owner_id: userId,
      invite_code: inviteCode,
      max_members: maxMembers ?? 10,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add owner as member
  await db.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "owner",
  });

  return NextResponse.json({ group }, { status: 201 });
}
