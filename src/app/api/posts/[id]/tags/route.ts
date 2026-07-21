import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function resolveOwnership(postId: string, userId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("posts").select("user_id").eq("id", postId).single();
  return data?.user_id === userId ? db : null;
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
  const db = await resolveOwnership(id, session.user.id);
  if (!db) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { x, y, name, brand, shop, price, link, color, position } = body;

  if (typeof x !== "number" || typeof y !== "number" || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: tag, error } = await db
    .from("post_item_tags")
    .insert({ post_id: id, x, y, name, brand, shop, price, link, color, position: position ?? 0 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag });
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
  const db = await resolveOwnership(id, session.user.id);
  if (!db) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tag_id } = await req.json();
  if (!tag_id) {
    return NextResponse.json({ error: "Missing tag_id" }, { status: 400 });
  }

  const { error } = await db
    .from("post_item_tags")
    .delete()
    .eq("id", tag_id)
    .eq("post_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
