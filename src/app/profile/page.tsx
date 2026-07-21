import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getLang, getT } from "@/lib/i18n";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import OutfitCard from "@/components/OutfitCard";
import TipCard from "@/components/TipCard";
import LookbookCard from "@/components/LookbookCard";
import ProfileTabs from "./ProfileTabs";
import EditProfileModal from "./EditProfileModal";
import { Suspense } from "react";

export const metadata = { title: "Profile — Style T-chai" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTabPosts(db: ReturnType<typeof supabaseAdmin>, userId: string, tab: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function attachCounts(data: any[], ids: string[]) {
    const [likesRes, savesRes] = await Promise.all([
      db.from("post_likes").select("post_id, user_id").in("post_id", ids),
      db.from("post_saves").select("post_id, user_id").in("post_id", ids),
    ]);
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
    return (data ?? []).map((row: any) => {
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
  }

  if (tab === "liked") {
    const { data: likes } = await db
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const ids = (likes ?? []).map((r: { post_id: string }) => r.post_id);
    if (ids.length === 0) return [];
    const { data } = await db.from("posts").select("*, users(name, image)").in("id", ids);
    const orderMap = Object.fromEntries(ids.map((id: string, i: number) => [id, i]));
    return (await attachCounts(data ?? [], ids)).sort(
      (a: { id: string }, b: { id: string }) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0)
    );
  }

  if (tab === "saved") {
    const { data: saves } = await db
      .from("post_saves")
      .select("post_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const ids = (saves ?? []).map((r: { post_id: string }) => r.post_id);
    if (ids.length === 0) return [];
    const { data } = await db.from("posts").select("*, users(name, image)").in("id", ids);
    const orderMap = Object.fromEntries(ids.map((id: string, i: number) => [id, i]));
    return (await attachCounts(data ?? [], ids)).sort(
      (a: { id: string }, b: { id: string }) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0)
    );
  }

  // default: posts tab — user's own posts
  const { data } = await db
    .from("posts")
    .select("*, users(name, image)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return [];
  const ids = data.map((r: { id: string }) => r.id);
  return attachCounts(data, ids);
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/auth/signin?callbackUrl=/profile");

  const lang = await getLang();
  const t = getT(lang);
  const { user } = session;
  const userId = user.id;
  const db = supabaseAdmin();

  const { tab = "posts" } = await searchParams;
  const activeTab = ["posts", "saved", "liked"].includes(tab) ? tab : "posts";

  const [
    { count: postCount },
    { count: followerCount },
    { count: followingCount },
    tabPosts,
    bioResult,
  ] = await Promise.all([
    db.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    db.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    db.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    fetchTabPosts(db, userId, activeTab),
    db.from("users").select("bio").eq("id", userId).single(),
  ]);

  const bio: string | null = (bioResult.data as { bio: string | null } | null)?.bio ?? null;

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-12 pb-24">
      {/* Header */}
      <div className="mb-10 space-y-2">
        <Eyebrow>{t.profile.eyebrow}</Eyebrow>
        <DisplayHeading as="h1" className="text-4xl">
          <em>{t.profile.greeting(user?.name?.split(" ")[0] ?? "")}</em>
        </DisplayHeading>
      </div>

      {/* Profile card */}
      <div className="bg-surface rounded-[20px] border border-line shadow-screen p-8 max-w-lg">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name ?? ""}
              width={104}
              height={104}
              className="rounded-full shrink-0"
            />
          ) : (
            <div
              className="w-[104px] h-[104px] rounded-full shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C9A66B, #8A6A44)" }}
            >
              <span className="font-serif text-3xl text-white font-normal">{initials}</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <DisplayHeading as="h2" className="text-2xl">{user?.name}</DisplayHeading>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
              {bio && (
                <p className="text-sm text-ink/80 mt-2 leading-relaxed">{bio}</p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              {[
                { num: String(postCount ?? 0), label: t.profile.posts },
                { num: String(followerCount ?? 0), label: t.profile.followers },
                { num: String(followingCount ?? 0), label: t.profile.following },
              ].map(({ num, label }) => (
                <div key={label} className="text-center">
                  <div className="font-serif text-2xl font-normal text-ink">{num}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <EditProfileModal initialName={user?.name ?? ""} initialBio={bio} />
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="mt-10">
        <Suspense>
          <ProfileTabs />
        </Suspense>

        <div className="mt-6">
          {tabPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              {activeTab === "posts" ? (
                <>
                  <Link
                    href="/post"
                    className="aspect-square w-24 rounded-[16px] border-2 border-dashed border-line-2 bg-surface-3 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <span className="text-2xl">＋</span>
                    <span className="text-xs">{t.profile.addPost}</span>
                  </Link>
                  <p className="text-sm mt-2">{t.profile.noPost}</p>
                </>
              ) : (
                <p className="text-sm">
                  {activeTab === "saved" ? t.profile.noSaved : t.profile.noLiked}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tabPosts.map((post: any) => {
                const isOwner = post.user_id === userId;
                if (post.post_type === "tip") return <TipCard key={post.id} tip={post} />;
                if (post.post_type === "lookbook") return <LookbookCard key={post.id} lookbook={post} />;
                return <OutfitCard key={post.id} outfit={post} isOwner={isOwner} />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
