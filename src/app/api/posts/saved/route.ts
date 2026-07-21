import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: saves } = await db
    .from("post_saves")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const postIds = (saves ?? []).map((s: { post_id: string }) => s.post_id);
  if (postIds.length === 0) return NextResponse.json({ posts: [] });

  const { data } = await db
    .from("posts")
    .select("*, users(name, image)")
    .in("id", postIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = (data ?? []).map((row: any) => {
    const userName: string = row.users?.name ?? "Unknown";
    const initials = userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const { users: _u, ...rest } = row;
    return { ...rest, author: { name: userName, avatar: initials }, _liked: false, _saved: true };
  });

  const orderMap = Object.fromEntries(postIds.map((id: string, i: number) => [id, i]));
  posts.sort((a: { id: string }, b: { id: string }) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));

  return NextResponse.json({ posts });
}
