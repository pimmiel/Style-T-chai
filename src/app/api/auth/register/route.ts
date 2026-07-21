import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimitByIP } from "@/lib/rateLimit";

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  if (!hasSupabase) {
    return NextResponse.json(
      { error: "NO_SUPABASE", message: "ยังไม่ได้ตั้งค่า Supabase — ใช้ DEV_PASSWORD ใน .env.local เพื่อทดสอบ login" },
      { status: 503 }
    );
  }

  const limited = rateLimitByIP(req, "register", 5, 60_000);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { name, email, password } = body ?? {};

  if (!name || !email || !password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Check if email already registered
  const { data: existing } = await db
    .schema("next_auth")
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้มีบัญชีอยู่แล้ว" }, { status: 409 });
  }

  // Create user in next_auth.users
  const { data: user, error: userError } = await db
    .schema("next_auth")
    .from("users")
    .insert({ name, email, emailVerified: null })
    .select("id")
    .single();

  if (userError || !user) {
    console.error("register: create user failed", JSON.stringify(userError), { code: userError?.code, message: userError?.message, details: userError?.details, hint: userError?.hint });
    return NextResponse.json({ error: userError?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { error: credError } = await db
    .from("user_credentials")
    .insert({ user_id: user.id, password_hash });

  if (credError) {
    // Rollback user creation to keep DB consistent
    await db.schema("next_auth").from("users").delete().eq("id", user.id);
    console.error("register: insert credentials failed", credError);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
