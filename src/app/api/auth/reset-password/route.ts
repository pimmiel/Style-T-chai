import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimitByIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (rateLimitByIP(req, "reset", 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const { token, password } = body ?? {};

  if (!token || !password) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const db = supabaseAdmin();

  const { data: record } = await db
    .from("password_reset_tokens")
    .select("user_id, expires_at, used")
    .eq("token", tokenHash)
    .single();

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "ลิงก์หมดอายุหรือถูกใช้แล้ว" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  // Upsert password (user may not have had a password before)
  await db
    .from("user_credentials")
    .upsert({ user_id: record.user_id, password_hash }, { onConflict: "user_id" });

  // Mark token as used
  await db
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("token", tokenHash);

  return NextResponse.json({ ok: true });
}
