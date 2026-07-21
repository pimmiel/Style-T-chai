import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { writeDigest } from "@/lib/weeklyDigest";

type ColorTag = { label?: string | null; hex?: string | null };
interface OutfitRow {
  id: string;
  caption: string | null;
  colors: ColorTag[] | null;
  user_id: string;
}
interface VoteRow {
  group_outfit_id: string;
  user_id: string;
}
interface TopOutfit {
  caption: string;
  votes: number;
  colors: ColorTag[] | null;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Last Sunday
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  // Get all groups with activity this week
  const { data: activeOutfits } = await db
    .from("group_outfits")
    .select("group_id")
    .gte("created_at", weekStartStr)
    .lt("created_at", weekEndStr);

  const groupIds = [...new Set((activeOutfits ?? []).map((o: { group_id: string }) => o.group_id))];
  if (groupIds.length === 0) {
    return NextResponse.json({ message: "No active groups this week", processed: 0 });
  }

  const { data: groups } = await db
    .from("groups")
    .select("id, name")
    .in("id", groupIds);

  let processed = 0;
  const errors: string[] = [];

  for (const group of groups ?? []) {
    try {
      // Fetch outfits + votes for this group this week
      const { data: outfits } = await db
        .from("group_outfits")
        .select("id, caption, colors, user_id")
        .eq("group_id", group.id)
        .gte("created_at", weekStartStr)
        .lt("created_at", weekEndStr);

      const outfitIds = (outfits ?? []).map((o: OutfitRow) => o.id);

      const { data: votes } = outfitIds.length
        ? await db
            .from("group_outfit_votes")
            .select("group_outfit_id, user_id")
            .in("group_outfit_id", outfitIds)
        : { data: [] };

      const voteCount = (id: string) => (votes ?? []).filter((v: VoteRow) => v.group_outfit_id === id).length;

      const topOutfits: TopOutfit[] = (outfits ?? [])
        .map((o: OutfitRow) => ({ caption: o.caption ?? "(ไม่มี caption)", votes: voteCount(o.id), colors: o.colors }))
        .sort((a: TopOutfit, b: TopOutfit) => b.votes - a.votes)
        .slice(0, 5);

      // Aggregate color trends
      const colorMap: Record<string, number> = {};
      for (const outfit of (outfits ?? []) as OutfitRow[]) {
        for (const c of outfit.colors ?? []) {
          const key = c.label ?? c.hex ?? "unknown";
          colorMap[key] = (colorMap[key] ?? 0) + 1;
        }
      }
      const colorTrends = Object.entries(colorMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const activeMembers = new Set([
        ...(outfits ?? []).map((o: OutfitRow) => o.user_id),
        ...(votes ?? []).map((v: VoteRow) => v.user_id),
      ]).size;

      const stats = {
        posts: (outfits ?? []).length,
        votes: (votes ?? []).length,
        activeMembers,
      };

      const { summary } = await writeDigest({
        groupName: group.name,
        stats,
        topOutfits,
        colorTrends,
      });

      await db.from("group_weekly_digests").upsert(
        {
          group_id: group.id,
          week_start: weekStartStr,
          summary,
          top_outfit_ids: topOutfits.map((_: TopOutfit, i: number) => outfitIds[i]).filter(Boolean),
          color_trends: colorTrends,
          stats,
        },
        { onConflict: "group_id,week_start" }
      );

      processed++;
    } catch (err) {
      console.error(`[weekly_digest] group ${group.id}:`, err);
      errors.push(group.id);
    }
  }

  return NextResponse.json({ processed, errors: errors.length ? errors : undefined });
}
