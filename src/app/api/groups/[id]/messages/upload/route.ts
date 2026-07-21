import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "ต้องแนบรูปภาพ" }, { status: 400 });

  const mime = file.type;
  if (!ALLOWED_MIME[mime]) {
    return NextResponse.json({ error: `ประเภทไฟล์ไม่รองรับ: ${mime}` }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 10 MB" }, { status: 400 });
  }

  const ext = ALLOWED_MIME[mime];
  const path = `${userId}/chat-${id}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await db.storage
    .from("post-images")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = db.storage.from("post-images").getPublicUrl(path);
  return NextResponse.json({ image_url: urlData.publicUrl });
}
