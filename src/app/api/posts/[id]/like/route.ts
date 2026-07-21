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

  const { id } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { error } = await db.from("post_likes").upsert(
    { post_id: id, user_id: userId },
    { onConflict: "post_id,user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: post } = await db.from("posts").select("user_id, caption").eq("id", id).single();
  if (post) {
    await createNotification({
      userId: post.user_id,
      actorId: userId,
      type: "post_liked",
      payload: { postId: id, postCaption: post.caption ?? null },
    });
  }

  return NextResponse.json({ liked: true });
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

  await db.from("post_likes").delete().eq("post_id", id).eq("user_id", userId);
  return NextResponse.json({ liked: false });
}
