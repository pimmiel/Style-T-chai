import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);

/**
 * Atomically increments the per-user daily AI call counter via the
 * `increment_ai_usage` Postgres function, then returns a 429 response if the
 * limit is exceeded. Returns null when the call is allowed.
 *
 * Usage:
 *   const limited = await checkAiRateLimit(userId);
 *   if (limited) return limited;
 */
export async function checkAiRateLimit(userId: string): Promise<NextResponse | null> {
  const db = supabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const { data: count, error } = await db.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_date: today,
  });

  if (error) {
    // Allow the call through if the counter itself fails — better to serve than
    // to block users due to a counter error. Log for monitoring.
    console.error("[aiRateLimit] RPC error:", error.message);
    return null;
  }

  if ((count as number) > DAILY_LIMIT) {
    return NextResponse.json(
      { error: "เกินจำนวน AI ที่ใช้ได้ต่อวัน กรุณาลองใหม่พรุ่งนี้" },
      { status: 429 }
    );
  }

  return null;
}
