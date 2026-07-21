import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getLang, getT } from "@/lib/i18n";
import OutfitCard from "@/components/OutfitCard";
import TipCard from "@/components/TipCard";
import LookbookCard from "@/components/LookbookCard";

export default async function BookmarksPage() {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/auth/signin");

  const lang = await getLang();
  const t = getT(lang);
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: saves } = await db
    .from("post_saves")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const postIds = (saves ?? []).map((s: { post_id: string }) => s.post_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let posts: any[] = [];
  if (postIds.length > 0) {
    const [{ data }, likesRes, savesRes] = await Promise.all([
      db.from("posts").select("*, users(name, image)").in("id", postIds),
      db.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      db.from("post_saves").select("post_id, user_id").in("post_id", postIds),
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

    const orderMap = Object.fromEntries(postIds.map((id: string, i: number) => [id, i]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts = (data ?? []).map((row: any) => {
      const userName: string = row.users?.name ?? "Unknown";
      const initials = userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      const { users: _u, ...rest } = row;
      return {
        ...rest,
        author: { name: userName, avatar: initials },
        likes: likeMap[row.id]?.count ?? 0,
        saves: saveMap[row.id]?.count ?? 0,
        _liked: likeMap[row.id]?.liked ?? false,
        _saved: saveMap[row.id]?.saved ?? true,
      };
    }).sort((a: { id: string }, b: { id: string }) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t.bookmarks.title}</h1>
        <p className="text-muted-foreground mt-1">{t.bookmarks.subtitle}</p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Bookmark className="w-10 h-10 opacity-30" />
          <p className="text-sm">{t.bookmarks.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((idea) => {
            const isOwner = idea.user_id === userId;
            if (idea.post_type === "tip") return <TipCard key={idea.id} tip={idea} />;
            if (idea.post_type === "lookbook") return <LookbookCard key={idea.id} lookbook={idea} />;
            return <OutfitCard key={idea.id} outfit={idea} isOwner={isOwner} />;
          })}
        </div>
      )}
    </div>
  );
}
