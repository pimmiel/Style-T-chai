import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetId } = await params;
  const followerId = session.user.id;

  if (followerId === targetId) {
    return NextResponse.json({ error: "ไม่สามารถติดตามตัวเองได้" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("user_follows").upsert(
    { follower_id: followerId, following_id: targetId },
    { onConflict: "follower_id,following_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createNotification({
    userId: targetId,
    actorId: followerId,
    type: "user_followed",
    payload: {},
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetId } = await params;
  const db = supabaseAdmin();

  await db.from("user_follows").delete()
    .eq("follower_id", session.user.id)
    .eq("following_id", targetId);

  return NextResponse.json({ following: false });
}
