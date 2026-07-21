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

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: digest } = await db
    .from("group_weekly_digests")
    .select("summary, stats, color_trends, week_start")
    .eq("group_id", id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ digest });
}
