import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate } from "@/lib/moderation";
import { checkAiRateLimit } from "@/lib/aiRateLimit";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const rateLimited = await checkAiRateLimit(userId);
  if (rateLimited) return rateLimited;

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const caption = formData.get("caption") as string | null;

  if (!file) return NextResponse.json({ error: "ต้องแนบรูปภาพ" }, { status: 400 });

  const mime = file.type;
  if (!ALLOWED_MIME[mime]) {
    return NextResponse.json({ error: `ประเภทไฟล์ไม่รองรับ: ${mime}` }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 10 MB" }, { status: 400 });
  }

  const ext = ALLOWED_MIME[mime];
  const path = `${userId}/group-${id}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await db.storage
    .from("post-images")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = db.storage.from("post-images").getPublicUrl(path);
  const image_url = urlData.publicUrl;

  let moderationStatus = "approved";
  let moderationReason: string | null = null;
  let moderationCategories: object | null = null;
  try {
    const verdict = await moderate({ caption: caption ?? undefined, imageUrl: image_url });
    moderationStatus = verdict.status;
    moderationReason = verdict.reason;
    moderationCategories = verdict.categories;
    if (verdict.status === "rejected") {
      await db.storage.from("post-images").remove([path]);
      return NextResponse.json(
        { error: `เนื้อหาไม่ผ่านการตรวจสอบ: ${verdict.reason}` },
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[moderation] group_outfit upload error:", err);
    moderationStatus = "flagged";
    moderationReason = "ตรวจสอบอัตโนมัติไม่สำเร็จ รอการรีวิว";
  }

  const { data: outfit, error } = await db
    .from("group_outfits")
    .insert({
      group_id: id,
      user_id: userId,
      image_url,
      caption: caption?.trim() || null,
      moderation_status: moderationStatus,
      moderation_reason: moderationReason,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void db.from("moderation_logs").insert({
    content_type: "group_outfit",
    content_id: outfit.id,
    status: moderationStatus,
    reason: moderationReason,
    categories: moderationCategories,
  });

  return NextResponse.json({ outfit }, { status: 201 });
}
