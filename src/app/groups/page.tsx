import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hasActiveSubscription } from "@/lib/entitlement";
import GroupsClient from "./GroupsClient";

export default async function GroupsPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return <GroupsClient initialGroups={[]} hasSub={false} userId={null} />;
  }

  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: memberships } = await db
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);

  const today = new Date().toISOString().split("T")[0];

  const [groupsData, countsData, hasSub, themesData] = await Promise.all([
    groupIds.length > 0
      ? db.from("groups").select("*").in("id", groupIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    groupIds.length > 0
      ? db.from("group_members").select("group_id").in("group_id", groupIds)
      : Promise.resolve({ data: [] }),
    hasActiveSubscription(userId),
    groupIds.length > 0
      ? db.from("group_theme_plans")
          .select("id, group_id, plan_date, theme_name, occasion, notes")
          .in("group_id", groupIds)
          .gte("plan_date", today)
          .order("plan_date", { ascending: true })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of countsData.data ?? []) {
    countMap[(c as { group_id: string }).group_id] = (countMap[(c as { group_id: string }).group_id] ?? 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups = (groupsData.data ?? []).map((g: any) => ({
    ...g,
    member_count: countMap[g.id] ?? 0,
  }));

  const groupNameMap: Record<string, string> = {};
  for (const g of groups) groupNameMap[g.id] = g.name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingThemes = (themesData.data ?? []).map((t: any) => ({
    ...t,
    group_name: groupNameMap[t.group_id] ?? "",
  }));

  return <GroupsClient initialGroups={groups} hasSub={hasSub} userId={userId} upcomingThemes={upcomingThemes} />;
}
