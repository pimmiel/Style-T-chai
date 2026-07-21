import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate } from "@/lib/moderation";
import { checkAiRateLimit } from "@/lib/aiRateLimit";

interface PostRow {
  id: string;
  users?: { name?: string | null } | null;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visibility = searchParams.get("visibility") ?? "explore";

  const db = supabaseAdmin();
  let viewerId: string | null = null;

  let query = db
    .from("posts")
    .select("*, users(name, image)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (visibility === "community") {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    viewerId = session.user.id;
    query = query.eq("user_id", viewerId);
  } else {
    const session = await getServerSession();
    viewerId = session?.user?.id ?? null;
    query = query.contains("visibility", ["explore"]).eq("moderation_status", "approved");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const postIds = (data ?? []).map((row: PostRow) => row.id);

  // Fetch likes and saves in parallel for real counts + viewer flags
  const [likesRes, savesRes] = postIds.length > 0
    ? await Promise.all([
        db.from("post_likes").select("post_id, user_id").in("post_id", postIds),
        db.from("post_saves").select("post_id, user_id").in("post_id", postIds),
      ])
    : [{ data: [] }, { data: [] }];

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

  const posts = (data ?? []).map((row: PostRow) => {
    const userName: string = row.users?.name ?? "Unknown";
    const initials = userName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const { users: _users, ...rest } = row;
    return {
      ...rest,
      post_type: row.post_type,
      author: { name: userName, avatar: initials },
      likes: likeMap[row.id]?.count ?? 0,
      saves: saveMap[row.id]?.count ?? 0,
      _liked: likeMap[row.id]?.liked ?? false,
      _saved: saveMap[row.id]?.saved ?? false,
    };
  });

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  try {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const metaRaw = formData.get("metadata");
  if (!metaRaw || typeof metaRaw !== "string") {
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const meta = JSON.parse(metaRaw);
  const db = supabaseAdmin();
  const userId = session.user.id;

  const ALLOWED_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const uploadImage = async (file: File, prefix: string): Promise<string> => {
    const mime = file.type;
    if (!ALLOWED_MIME[mime]) {
      throw new Error(`ประเภทไฟล์ไม่รองรับ: ${mime}`);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("ไฟล์ใหญ่เกิน 10 MB");
    }
    const ext = ALLOWED_MIME[mime];
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error } = await db.storage
      .from("post-images")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = db.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const deleteImage = async (url: string) => {
    try {
      const path = url.split("/post-images/")[1];
      if (path) await db.storage.from("post-images").remove([path]);
    } catch {}
  };

  const insertData: Record<string, unknown> = {
    user_id: userId,
    post_type: meta.postType,
    visibility: meta.visibility ?? ["explore"],
  };

  let imageUrlForModeration: string | undefined;
  let captionForModeration: string | undefined;

  if (meta.postType === "outfit") {
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: "รูป Outfit จำเป็น" }, { status: 400 });
    }
    insertData.image_url = await uploadImage(imageFile, "outfit");
    insertData.caption = meta.caption ?? null;
    insertData.style_tag = meta.styleTag ?? null;
    insertData.occasion_tag = meta.occasionTag ?? null;
    insertData.gender_tag = meta.genderTag ?? null;
    insertData.colors = meta.colors ?? null;
    imageUrlForModeration = insertData.image_url as string;
    captionForModeration = insertData.caption as string | undefined;
  } else if (meta.postType === "tip") {
    if (!meta.tipTitle?.trim() || !meta.tipBody?.trim()) {
      return NextResponse.json({ error: "หัวข้อและเนื้อหาจำเป็น" }, { status: 400 });
    }
    insertData.title = meta.tipTitle;
    insertData.body = meta.tipBody;
    insertData.tags = meta.tipTags ?? [];
    const tipFile = formData.get("tipImage") as File | null;
    if (tipFile) {
      insertData.tip_image_url = await uploadImage(tipFile, "tip");
      imageUrlForModeration = insertData.tip_image_url as string;
    }
    captionForModeration = `${meta.tipTitle} ${meta.tipBody}`;
  } else if (meta.postType === "lookbook") {
    const lbFiles = formData.getAll("images") as File[];
    if (lbFiles.length < 2) {
      return NextResponse.json({ error: "ต้องมีรูปอย่างน้อย 2 รูป" }, { status: 400 });
    }
    const urls = await Promise.all(lbFiles.map((f, i) => uploadImage(f, `lb-${i}`)));
    insertData.images = urls;
    insertData.lookbook_title = meta.lbTitle ?? null;
    insertData.description = meta.lbDesc ?? null;
    insertData.style_tag = meta.lbStyleTag ?? null;
    insertData.gender_tag = meta.lbGenderTag ?? null;
    imageUrlForModeration = urls[0];
    captionForModeration = meta.lbTitle ?? meta.lbDesc ?? undefined;
  }

  // Rate-limit AI calls per user per day
  const rateLimited = await checkAiRateLimit(userId);
  if (rateLimited) return rateLimited;

  // Moderation — default flagged on error, never block upload flow
  let moderationStatus: string = "approved";
  let moderationReason: string | null = null;
  let moderationCategories: object | null = null;
  try {
    const verdict = await moderate({
      caption: captionForModeration,
      imageUrl: imageUrlForModeration,
    });
    moderationStatus = verdict.status;
    moderationReason = verdict.reason;
    moderationCategories = verdict.categories;

    if (verdict.status === "rejected") {
      // Remove uploaded images before rejecting
      if (imageUrlForModeration) await deleteImage(imageUrlForModeration);
      if (Array.isArray(insertData.images)) {
        await Promise.all((insertData.images as string[]).map(deleteImage));
      }
      return NextResponse.json(
        { error: `เนื้อหาไม่ผ่านการตรวจสอบ: ${verdict.reason}` },
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[moderation] error:", err);
    moderationStatus = "flagged";
    moderationReason = "ตรวจสอบอัตโนมัติไม่สำเร็จ รอการรีวิว";
  }

  insertData.moderation_status = moderationStatus;
  insertData.moderation_reason = moderationReason;

  const { data: post, error } = await db
    .from("posts")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[POST /api/posts] db insert error:", error.message);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }

  // Write moderation log async (non-blocking)
  void db.from("moderation_logs")
    .insert({
      content_type: "post",
      content_id: post.id,
      status: moderationStatus,
      reason: moderationReason,
      categories: moderationCategories,
    });

  const userName: string = session.user.name ?? "You";
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return NextResponse.json(
    { post: { ...post, author: { name: userName, avatar: initials }, likes: 0, saves: 0 } },
    { status: 201 }
  );
  } catch (err: unknown) {
    console.error("[POST /api/posts] uncaught:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
