import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const session = await getServerSession();

  const { data: post, error } = await db
    .from("posts")
    .select("*, users(name, image)")
    .eq("id", id)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: tags } = await db
    .from("post_item_tags")
    .select("*")
    .eq("post_id", id)
    .order("position");

  const isOwner = session?.user?.id === post.user_id;

  return NextResponse.json({ post, tags: tags ?? [], isOwner });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("posts")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== session.user.id) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = [
    "caption", "style_tag", "occasion_tag", "gender_tag", "colors",
    "title", "body", "tags", "lookbook_title", "description", "visibility",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data: post, error } = await db
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userName: string = session.user.name ?? "You";
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return NextResponse.json({ post: { ...post, author: { name: userName, avatar: initials } } });
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
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("posts")
    .select("user_id, image_url, tip_image_url, images")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== session.user.id) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });
  }

  const pathsToDelete: string[] = [];
  const extractPath = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/post-images/");
      if (parts[1]) pathsToDelete.push(parts[1]);
    } catch {}
  };

  if (existing.image_url) extractPath(existing.image_url);
  if (existing.tip_image_url) extractPath(existing.tip_image_url);
  if (Array.isArray(existing.images)) {
    existing.images.forEach((url: string) => extractPath(url));
  }

  if (pathsToDelete.length > 0) {
    await db.storage.from("post-images").remove(pathsToDelete);
  }

  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
