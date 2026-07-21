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

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const today = new Date().toISOString().split("T")[0];

  const { data: themes } = await db
    .from("group_theme_plans")
    .select("*")
    .eq("group_id", id)
    .gte("plan_date", today)
    .order("plan_date");

  return NextResponse.json({ themes });
}

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

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { plan_date, theme_name, colors, occasion, notes } = await req.json();
  if (!plan_date || !theme_name) {
    return NextResponse.json({ error: "plan_date and theme_name required" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(plan_date) < today) {
    return NextResponse.json({ error: "ไม่สามารถเลือกวันที่ผ่านมาแล้ว" }, { status: 400 });
  }

  const { data: theme, error } = await db
    .from("group_theme_plans")
    .upsert(
      { group_id: id, plan_date, theme_name, colors, occasion, notes, created_by: userId },
      { onConflict: "group_id,plan_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ theme }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { theme_id } = await req.json();
  const db = supabaseAdmin();

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  await db.from("group_theme_plans").delete().eq("id", theme_id).eq("group_id", id);
  return NextResponse.json({ ok: true });
}
