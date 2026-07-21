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

  const { data: members } = await db
    .from("group_members")
    .select("*, users(name, email, image)")
    .eq("group_id", id);

  return NextResponse.json({ members });
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
  const { targetUserId } = await req.json();
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: group } = await db.from("groups").select("owner_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = targetUserId === userId;
  const isOwner = group.owner_id === userId;

  // Owner can remove others; anyone can leave (remove themselves)
  if (!isSelf && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Owner can't leave (must delete group instead)
  if (isSelf && isOwner) {
    return NextResponse.json(
      { error: "Owner cannot leave — delete the group instead" },
      { status: 400 }
    );
  }

  await db
    .from("group_members")
    .delete()
    .eq("group_id", id)
    .eq("user_id", targetUserId);

  return NextResponse.json({ ok: true });
}
