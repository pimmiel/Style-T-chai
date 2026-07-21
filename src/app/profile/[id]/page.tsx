import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getLang, getT } from "@/lib/i18n";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import OutfitCard from "@/components/OutfitCard";
import TipCard from "@/components/TipCard";
import LookbookCard from "@/components/LookbookCard";
import FollowButton from "./FollowButton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchProfilePosts(db: ReturnType<typeof supabaseAdmin>, profileId: string, viewerId: string | null): Promise<any[]> {
  const { data: rawPosts } = await db
    .from("posts")
    .select("*, users(name, image)")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });

  if (!rawPosts || rawPosts.length === 0) return [];

  const postIds = rawPosts.map((r) => r.id as string);

  const [likesRes, savesRes] = await Promise.all([
    db.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    db.from("post_saves").select("post_id, user_id").in("post_id", postIds),
  ]);

  const likeMap: Record<string, { count: number; liked: boolean }> = {};
  const saveMap: Record<string, { count: number; saved: boolean }> = {};

  for (const row of likesRes.data ?? []) {
    const r = row as { post_id: string; user_id: string };
    if (!likeMap[r.post_id]) likeMap[r.post_id] = { count: 0, liked: false };
    likeMap[r.post_id].count++;
    if (r.user_id === viewerId) likeMap[r.post_id].liked = true;
  }
  for (const row of savesRes.data ?? []) {
    const r = row as { post_id: string; user_id: string };
    if (!saveMap[r.post_id]) saveMap[r.post_id] = { count: 0, saved: false };
    saveMap[r.post_id].count++;
    if (r.user_id === viewerId) saveMap[r.post_id].saved = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawPosts.map((row: any) => {
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

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: profileId } = await params;
  const session = await getServerSession();
  const viewerId = session?.user?.id ?? null;
  const lang = await getLang();
  const t = getT(lang);

  const db = supabaseAdmin();

  const [
    profileRes,
    { count: postCount },
    { count: followerCount },
    { count: followingCount },
    followingRes,
    posts,
  ] = await Promise.all([
    db.from("users").select("id, name, image, bio").eq("id", profileId).single(),
    db.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profileId),
    db.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
    db.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
    viewerId
      ? db.from("user_follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", profileId).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchProfilePosts(db, profileId, viewerId),
  ]);

  if (!profileRes.data) notFound();

  const profile = profileRes.data as { id: string; name: string; image: string | null; bio: string | null };
  const isOwnProfile = viewerId === profileId;
  const isFollowing = followingRes.data !== null;

  const initials = profile.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-12 pb-24">
      {/* Header */}
      <div className="mb-10 space-y-2">
        <Eyebrow>{t.profile.eyebrow.replace("ของคุณ", "").trim()}</Eyebrow>
        <DisplayHeading as="h1" className="text-4xl">
          <em>{profile.name?.split(" ")[0] ?? ""}</em>
        </DisplayHeading>
      </div>

      {/* Profile card */}
      <div className="bg-surface rounded-[20px] border border-line shadow-screen p-8 max-w-lg">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {profile.image ? (
            <Image
              src={profile.image}
              alt={profile.name ?? ""}
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
              <DisplayHeading as="h2" className="text-2xl">{profile.name}</DisplayHeading>
              {profile.bio && (
                <p className="text-sm text-ink/80 mt-2 leading-relaxed">{profile.bio}</p>
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
              {isOwnProfile ? (
                <Link
                  href="/profile"
                  className="px-5 py-2 rounded-full border border-line text-ink text-sm font-medium hover:bg-surface-2 transition-colors"
                >
                  {t.profile.editProfileLink}
                </Link>
              ) : viewerId ? (
                <FollowButton userId={profileId} initialFollowing={isFollowing} />
              ) : (
                <Link
                  href={`/auth/signin?callbackUrl=/profile/${profileId}`}
                  className="px-5 py-2 rounded-full bg-ink text-surface text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t.profile.follow}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div className="mt-10">
        <h2 className="text-sm font-medium text-muted-foreground mb-5 uppercase tracking-wide">
          {t.profile.allPosts}
        </h2>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <p className="text-sm">{t.profile.noPosts}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {posts.map((post: any) => {
              if (post.post_type === "tip") return <TipCard key={post.id} tip={post} />;
              if (post.post_type === "lookbook") return <LookbookCard key={post.id} lookbook={post} />;
              return <OutfitCard key={post.id} outfit={post} isOwner={isOwnProfile} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
