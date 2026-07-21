import { redirect, notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import GroupDetailClient from "./GroupDetailClient";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    const { id } = await params;
    redirect(`/auth/signin?callbackUrl=/groups/${id}`);
  }

  const { id } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();

  if (!membership) notFound();

  const today = new Date().toISOString().split("T")[0];

  const [groupRes, membersRes, themesRes, outfitsRes, digestRes] = await Promise.all([
    db.from("groups").select("*").eq("id", id).single(),
    db.from("group_members").select("*, users(name, email, image)").eq("group_id", id),
    db.from("group_theme_plans").select("*").eq("group_id", id).gte("plan_date", today).order("plan_date"),
    db.from("group_outfits").select("*, users(name, image)").eq("group_id", id).eq("moderation_status", "approved").order("created_at", { ascending: false }),
    db.from("group_weekly_digests").select("summary, stats").eq("group_id", id).order("week_start", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!groupRes.data) notFound();

  // Enrich outfits with vote counts and whether the current user voted
  const outfitIds = (outfitsRes.data ?? []).map((o: { id: string }) => o.id);
  const { data: votes } = outfitIds.length > 0
    ? await db.from("group_outfit_votes").select("group_outfit_id, user_id").in("group_outfit_id", outfitIds)
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outfits = (outfitsRes.data ?? []).map((o: any) => {
    const outfitVotes = (votes ?? []).filter((v: { group_outfit_id: string }) => v.group_outfit_id === o.id);
    return {
      ...o,
      votes_count: outfitVotes.length,
      _voted: outfitVotes.some((v: { user_id: string }) => v.user_id === userId),
    };
  });

  return (
    <GroupDetailClient
      group={groupRes.data}
      members={membersRes.data ?? []}
      themes={themesRes.data ?? []}
      outfits={outfits}
      digest={digestRes.data ?? null}
      role={membership.role as "owner" | "member"}
      userId={userId}
    />
  );
}
