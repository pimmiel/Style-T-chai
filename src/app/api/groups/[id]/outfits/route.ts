import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate } from "@/lib/moderation";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { validateImageUrl } from "@/lib/gemini";

interface OutfitRow {
  id: string;
  [key: string]: unknown;
}
interface OutfitVoteRow {
  group_outfit_id: string;
  user_id: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: outfits } = await db
    .from("group_outfits")
    .select("*, users(name, image)")
    .eq("group_id", id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false });

  const outfitIds = (outfits ?? []).map((o: OutfitRow) => o.id);
  const { data: votes } = await db
    .from("group_outfit_votes")
    .select("group_outfit_id, user_id")
    .in("group_outfit_id", outfitIds);

  const enriched = (outfits ?? []).map((o: OutfitRow) => {
    const outfitVotes = (votes ?? []).filter((v: OutfitVoteRow) => v.group_outfit_id === o.id);
    return {
      ...o,
      votes_count: outfitVotes.length,
      _voted: outfitVotes.some((v: OutfitVoteRow) => v.user_id === userId),
    };
  });

  return NextResponse.json({ outfits: enriched });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { image_url, caption, colors } = await req.json();
  if (!image_url) {
    return NextResponse.json({ error: "image_url required" }, { status: 400 });
  }
  try {
    validateImageUrl(image_url);
  } catch {
    return NextResponse.json({ error: "image_url ไม่ถูกต้อง" }, { status: 400 });
  }

  // Rate-limit AI calls per user per day
  const rateLimited = await checkAiRateLimit(userId);
  if (rateLimited) return rateLimited;

  // Moderation — default flagged on error
  let moderationStatus: string = "approved";
  let moderationReason: string | null = null;
  let moderationCategories: object | null = null;
  try {
    const verdict = await moderate({ caption, imageUrl: image_url });
    moderationStatus = verdict.status;
    moderationReason = verdict.reason;
    moderationCategories = verdict.categories;

    if (verdict.status === "rejected") {
      return NextResponse.json(
        { error: `เนื้อหาไม่ผ่านการตรวจสอบ: ${verdict.reason}` },
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[moderation] group_outfit error:", err);
    moderationStatus = "flagged";
    moderationReason = "ตรวจสอบอัตโนมัติไม่สำเร็จ รอการรีวิว";
  }

  const { data: outfit, error } = await db
    .from("group_outfits")
    .insert({
      group_id: id,
      user_id: userId,
      image_url,
      caption,
      colors,
      moderation_status: moderationStatus,
      moderation_reason: moderationReason,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void db.from("moderation_logs")
    .insert({
      content_type: "group_outfit",
      content_id: outfit.id,
      status: moderationStatus,
      reason: moderationReason,
      categories: moderationCategories,
    });

  return NextResponse.json({ outfit }, { status: 201 });
}
