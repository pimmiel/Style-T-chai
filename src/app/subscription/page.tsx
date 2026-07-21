import { Suspense } from "react";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import SubscriptionClient from "./SubscriptionClient";

export default async function SubscriptionPage() {
  const session = await getServerSession();

  let initialPlan: number | null = null;
  if (session?.user?.id) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .maybeSingle();
    initialPlan = data?.plan_type ?? null;
  }

  return (
    <Suspense>
      <SubscriptionClient initialPlan={initialPlan} />
    </Suspense>
  );
}
