import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const db = supabaseAdmin();
  const userId = session.user.id;

  // Get IDs of users this person follows
  const { data: follows } = await db
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);
  const followingIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);

  // Own posts + followed users' approved posts
  const [ownRes, followedRes] = await Promise.all([
    db.from("posts").select("*, users(name, image)").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
    followingIds.length > 0
      ? db.from("posts").select("*, users(name, image)").in("user_id", followingIds).eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(25)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPosts: any[] = [
    ...(ownRes.data ?? []),
    ...(followedRes.data ?? []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);

  const postIds = rawPosts.map((r) => r.id as string);

  const [likesRes, savesRes] = postIds.length > 0
    ? await Promise.all([
        db.from("post_likes").select("post_id, user_id").in("post_id", postIds),
        db.from("post_saves").select("post_id, user_id").in("post_id", postIds),
      ])
    : [{ data: [] }, { data: [] }];

  const likeMap: Record<string, { count: number; liked: boolean }> = {};
  const saveMap: Record<string, { count: number; saved: boolean }> = {};
  for (const row of likesRes.data ?? []) {
    const r = row as { post_id: string; user_id: string };
    if (!likeMap[r.post_id]) likeMap[r.post_id] = { count: 0, liked: false };
    likeMap[r.post_id].count++;
    if (r.user_id === userId) likeMap[r.post_id].liked = true;
  }
  for (const row of savesRes.data ?? []) {
    const r = row as { post_id: string; user_id: string };
    if (!saveMap[r.post_id]) saveMap[r.post_id] = { count: 0, saved: false };
    saveMap[r.post_id].count++;
    if (r.user_id === userId) saveMap[r.post_id].saved = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = rawPosts.map((row: any) => {
    const userName: string = row.users?.name ?? "Unknown";
    const initials = userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const { users: _u, ...rest } = row;
    return {
      ...rest,
      author: { name: userName, avatar: initials },
      likes: likeMap[row.id]?.count ?? 0,
      saves: saveMap[row.id]?.count ?? 0,
      _liked: likeMap[row.id]?.liked ?? false,
      _saved: saveMap[row.id]?.saved ?? false,
    };
  });

  return <FeedClient initialPosts={posts} userId={userId} />;
}
