import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { outfitFeedback } from "@/lib/outfitFeedback";
import { checkAiRateLimit } from "@/lib/aiRateLimit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; outfitId: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, outfitId } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: outfit } = await db
    .from("group_outfits")
    .select("image_url, caption, ai_feedback, ai_feedback_at")
    .eq("id", outfitId)
    .eq("group_id", id)
    .single();

  if (!outfit) return NextResponse.json({ error: "Outfit not found" }, { status: 404 });

  // Return cached result if already generated — no AI call, no rate limit consumed
  if (outfit.ai_feedback) {
    return NextResponse.json({ feedback: outfit.ai_feedback, theme_fit: null, cached: true });
  }

  // Rate-limit AI calls per user per day
  const rateLimited = await checkAiRateLimit(userId);
  if (rateLimited) return rateLimited;

  // Get today's theme plan for this group (if any)
  const today = new Date().toISOString().split("T")[0];
  const { data: themePlan } = await db
    .from("group_theme_plans")
    .select("theme_name, occasion, colors")
    .eq("group_id", id)
    .eq("plan_date", today)
    .maybeSingle();

  try {
    const result = await outfitFeedback({
      imageUrl: outfit.image_url,
      caption: outfit.caption ?? undefined,
      theme: themePlan ?? null,
    });

    await db
      .from("group_outfits")
      .update({ ai_feedback: result.feedback, ai_feedback_at: new Date().toISOString() })
      .eq("id", outfitId);

    return NextResponse.json({ feedback: result.feedback, theme_fit: result.theme_fit });
  } catch (err) {
    console.error("[outfit_feedback] error:", err);
    return NextResponse.json({ error: "ไม่สามารถรับฟีดแบ็กได้ในขณะนี้" }, { status: 503 });
  }
}
