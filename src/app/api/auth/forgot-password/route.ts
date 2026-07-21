import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimitByIP, rateLimitByEmail } from "@/lib/rateLimit";

const OK = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  if (rateLimitByIP(req, "forgot", 10, 60_000)) return OK; // silent — don't leak rate info

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : null;

  // Always return 200 — prevents email enumeration
  if (!email) return OK;
  if (rateLimitByEmail(email, "forgot", 3, 300_000)) return OK;

  const db = supabaseAdmin();
  const { data: user } = await db
    .schema("next_auth")
    .from("users")
    .select("id, name")
    .eq("email", email)
    .single();

  if (!user || !process.env.EMAIL_SERVER) return OK;

  // Generate a secure random token; store its SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await db.from("password_reset_tokens").insert({
    token: tokenHash,
    user_id: user.id,
    expires_at: expiresAt,
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? ""}/auth/reset?token=${rawToken}`;

  try {
    const transport = nodemailer.createTransport(process.env.EMAIL_SERVER);
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@styletchai.com",
      to: email,
      subject: "รีเซ็ตรหัสผ่าน Style T-chai",
      html: `
        <p>สวัสดี ${user.name ?? ""},</p>
        <p>คลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์หมดอายุใน 30 นาที</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน ไม่ต้องทำอะไร</p>
      `,
    });
  } catch (err) {
    console.error("forgot-password: email send failed", err);
  }

  return OK;
}
