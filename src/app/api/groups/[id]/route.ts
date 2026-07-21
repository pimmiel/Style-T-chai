import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  // Check membership
  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: group } = await db.from("groups").select("*").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: members } = await db
    .from("group_members")
    .select("*, users(name, email, image)")
    .eq("group_id", id);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: themes } = await db
    .from("group_theme_plans")
    .select("*")
    .eq("group_id", id)
    .gte("plan_date", today)
    .lte("plan_date", sevenDaysLater)
    .order("plan_date");

  return NextResponse.json({ group, members, themes, role: membership.role });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: group } = await db.from("groups").select("owner_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (group.owner_id !== userId) {
    return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });
  }

  await db.from("groups").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
