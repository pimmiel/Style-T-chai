import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: group } = await db.from("groups").select("owner_id, invite_code").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (group.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Only owner can regenerate invite link" }, { status: 403 });
  }

  // Return existing code (or regenerate on explicit request)
  const url = `${process.env.NEXTAUTH_URL}/groups/invite/${group.invite_code}`;
  return NextResponse.json({ url, code: group.invite_code });
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: group } = await db.from("groups").select("owner_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (group.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Only owner can regenerate invite link" }, { status: 403 });
  }

  const newCode = nanoid(10);
  await db.from("groups").update({ invite_code: newCode }).eq("id", id);

  const url = `${process.env.NEXTAUTH_URL}/groups/invite/${newCode}`;
  return NextResponse.json({ url, code: newCode });
}
