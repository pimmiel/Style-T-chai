# Handover — ระบบล็อกอิน (Social + Email/Password)

> เอกสารส่งงานให้ Claude Code เพิ่ม/แก้ระบบล็อกอินของ Style T-chai
> เป้าหมาย: รองรับ **ทั้ง social login (LINE/Google/Facebook/Apple) + magic-link + email/password**
> Stack ที่ใช้อยู่: **NextAuth v4** + `@auth/supabase-adapter` + Supabase

---

## 0. สถานะปัจจุบัน + ปัญหาที่ต้องแก้

**มีอยู่แล้ว** (`src/lib/auth.ts`):
- NextAuth v4 + Supabase adapter, `session.strategy = "database"` (เมื่อมี Supabase env)
- Providers: Google (เปิดตลอด) + LINE/Facebook/Apple/Email (เปิดแบบมีเงื่อนไขจาก env)
- callback ยัด `session.user.id` แล้ว, หน้า signin = `/auth/signin`, route = `/api/auth/[...nextauth]`
- `src/types/next-auth.d.ts` extend `session.user.id` เรียบร้อย

**🐞 บั๊กที่ต้องแก้ก่อน:**
- `src/app/auth/signin/page.tsx` เรียก `signIn("credentials", …)` แต่ **`auth.ts` ไม่มี `CredentialsProvider`** → ฟอร์ม email/password error เสมอ
- ปุ่ม OAuth/LINE/magic-link ที่ config ไว้ **ไม่ได้แสดงบนหน้า signin เลย** (มีแค่ฟอร์ม password ที่พัง)

---

## 1. การตัดสินใจเชิงสถาปัตยกรรม (อ่านก่อน — สำคัญที่สุด)

**⚠️ NextAuth v4: `CredentialsProvider` ใช้ได้เฉพาะกับ `session.strategy = "jwt"` เท่านั้น** — ใช้กับ database session (adapter) **ไม่ได้** เพราะ credentials ไม่สร้าง session ผ่าน adapter

ตอนนี้โค้ดตั้ง `strategy: "database"` เมื่อมี Supabase → **ถ้าจะเอา email/password ต้องสลับเป็น JWT**

**วิธีที่แนะนำ (รองรับทั้งสองแบบพร้อมกัน):**
- ตั้ง `session.strategy = "jwt"` **ทั่วทั้งแอป**
- **คง Supabase adapter ไว้** — adapter ยังเก็บ `users`/`accounts` ให้ (OAuth ยังทำงานปกติ) แค่ session ถือเป็น JWT แทน DB row
- callback เดิมรองรับอยู่แล้ว: `session.user.id = user?.id ?? token?.sub` — เพิ่ม `jwt` callback ให้ set `token.sub`/`token.uid` ตอน sign in

```ts
// src/lib/auth.ts — เปลี่ยน session strategy
session: { strategy: "jwt" as const },   // เดิมเป็น "database" เมื่อมี supabase

callbacks: {
  async jwt({ token, user }) {
    if (user) token.uid = user.id;        // ครั้งแรกที่ล็อกอิน
    return token;
  },
  session({ session, token }) {
    if (session.user) session.user.id = (token.uid as string) ?? token.sub ?? "";
    return session;
  },
},
```

> ผลข้างเคียง: session ที่เป็น DB row เดิม (ถ้ามี user ล็อกอินค้างอยู่) จะต้องล็อกอินใหม่ — ยอมรับได้เพราะยังไม่ launch

---

## 2. Env vars (เพิ่ม/ยืนยันใน `.env.local` + `.env.local.example`)

```bash
# --- NextAuth core (มีอยู่แล้ว) ---
NEXTAUTH_SECRET=...            # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# --- Social providers ---
GOOGLE_CLIENT_ID=...           # มีแล้ว
GOOGLE_CLIENT_SECRET=...
LINE_CLIENT_ID=...             # ★ แนะนำเปิด — คนไทยใช้เยอะสุด
LINE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...         # optional
FACEBOOK_CLIENT_SECRET=...
APPLE_ID=...                   # optional (ตั้งค่ายุ่งสุด)
APPLE_SECRET=...

# --- Email magic-link + password reset (ใช้ nodemailer ที่ติดตั้งแล้ว) ---
EMAIL_SERVER=smtp://user:pass@smtp.host:587
EMAIL_FROM=noreply@styletchai.com
```

**Callback/Redirect URL ที่ต้องตั้งในหน้า console ของแต่ละเจ้า:**
`{NEXTAUTH_URL}/api/auth/callback/{provider}` เช่น `.../api/auth/callback/line`, `.../api/auth/callback/google`

---

## 3. Part A — Social login + Magic link (งานน้อย ส่วนใหญ่แค่ config + UI)

Providers config มีใน `auth.ts` แล้ว — งานที่เหลือ:

1. ตั้ง env ของ provider ที่จะเปิด (อย่างน้อย LINE + Google)
2. **แก้หน้า signin ให้โชว์ปุ่ม** (ดู §5)
3. LINE: สมัคร LINE Login channel (LINE Developers Console) → เอา Channel ID/Secret มาใส่ + ใส่ callback URL
4. Email magic-link: ตั้ง `EMAIL_SERVER` + `EMAIL_FROM` แล้ว provider จะเปิดเอง (เงื่อนไข `hasSupabase && EMAIL_SERVER` ในโค้ดเดิม)

การเรียกใช้ (มี pattern อยู่แล้วในแอป เช่น subscription page):
```ts
signIn("line",   { callbackUrl });
signIn("google", { callbackUrl });
signIn("email",  { email, callbackUrl });   // magic link
```

---

## 4. Part B — Email/Password (งานหลัก)

### 4.1 ติดตั้ง
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### 4.2 Migration — เก็บ password แยกจาก adapter
> Supabase adapter จัดการตาราง `next_auth.users` เอง — **อย่าไปยุ่ง** ให้เก็บ hash ในตารางแยก

```sql
create table if not exists public.user_credentials (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  password_hash text not null,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ตารางสำหรับ reset password (token ใช้ครั้งเดียว มีวันหมดอายุ)
create table if not exists public.password_reset_tokens (
  token text primary key,               -- เก็บเป็น hash ของ token (ไม่เก็บ plaintext)
  user_id uuid not null references next_auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);
```

### 4.3 เพิ่ม `CredentialsProvider` ใน `auth.ts`
```ts
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

CredentialsProvider({
  name: "credentials",
  credentials: { email: {}, password: {} },
  async authorize(creds) {
    if (!creds?.email || !creds?.password) return null;
    const db = supabaseAdmin();
    // 1) หา user จาก next_auth.users ด้วย email
    const { data: user } = await db.schema("next_auth").from("users")
      .select("id, name, email, image").eq("email", creds.email).single();
    if (!user) return null;
    // 2) ดึง hash แล้วเทียบ
    const { data: cred } = await db.from("user_credentials")
      .select("password_hash").eq("user_id", user.id).single();
    if (!cred) return null;
    const ok = await bcrypt.compare(creds.password, cred.password_hash);
    if (!ok) return null;
    return { id: user.id, name: user.name, email: user.email, image: user.image };
  },
}),
```
> ⚠️ `authorize` ต้องรันบน **node runtime** (ไม่ใช่ edge) — bcrypt ใช้ edge ไม่ได้ NextAuth route เป็น node อยู่แล้วโดย default

### 4.4 Signup route — `src/app/api/auth/register/route.ts` (POST)
adapter ไม่สร้าง user ให้กรณี credentials → ต้องสร้างเอง:
1. validate email/password (ความยาว ≥ 8, รูปแบบ email)
2. เช็คว่า email ยังไม่มีใน `next_auth.users`
3. `bcrypt.hash(password, 12)`
4. insert `next_auth.users` (id, name, email) → ได้ user id
5. insert `user_credentials` (user_id, password_hash)
6. (แนะนำ) ส่ง email ยืนยันตัวตน
7. return 201 (อย่าคืน hash) — ฝั่ง client เรียก `signIn("credentials", …)` ต่อ

### 4.5 Reset password (2 route)
- `POST /api/auth/forgot-password` — รับ email → ถ้ามี user สร้าง token สุ่ม, เก็บ **hash ของ token** ใน `password_reset_tokens` (หมดอายุ ~30 นาที), ส่งลิงก์ `/(auth)/reset?token=...` ทางอีเมล (`nodemailer`).
  - **สำคัญ:** ตอบ 200 เสมอไม่ว่าเจอ email หรือไม่ (กัน email enumeration)
- `POST /api/auth/reset-password` — รับ token + password ใหม่ → hash token แล้วหาใน DB, เช็ค `expires_at`/`used`, อัปเดต `password_hash`, mark `used=true`

### 4.6 Rate limiting (จำเป็นสำหรับ credentials)
ใส่ที่ `authorize`, `register`, `forgot-password` — จำกัดตาม IP/email (เช่น Upstash Redis หรือ in-memory ง่าย ๆ ช่วงแรก) กัน brute-force

---

## 5. หน้า Sign in / Sign up (UI)

> สไตล์ตาม editorial: ใช้ tokens/ฟอนต์/`ScreenCard`/pill buttons จาก `docs/DESIGN_HANDOVER_EDITORIAL.md` (ล็อกอินหน้าตาให้เข้าชุดกับดีไซน์ใหม่)

**แก้ `src/app/auth/signin/page.tsx`:**
1. **ปุ่ม social ก่อน** (เด่นสุด): "เข้าสู่ระบบด้วย LINE" (สีเขียว LINE), "ด้วย Google", (option Facebook/Apple)
2. เส้นคั่น "หรือ"
3. ฟอร์ม email/password (อันนี้ค่อยใช้ได้จริงหลังทำ §4) + ลิงก์ "ลืมรหัสผ่าน?"
4. ลิงก์ไปหน้า **สมัครสมาชิก** ใหม่
5. magic-link: ปุ่ม "ส่งลิงก์เข้าอีเมล" → `signIn("email", {email})`

**หน้าใหม่:**
- `src/app/auth/signup/page.tsx` — ฟอร์มสมัคร (name, email, password, ยืนยันรหัส) → `POST /api/auth/register` → `signIn("credentials")`
- `src/app/auth/forgot/page.tsx` + `src/app/auth/reset/page.tsx`

---

## 6. Security checklist
- [ ] `bcrypt.hash` cost ≥ 12; ไม่เก็บ/log plaintext password ที่ใด
- [ ] `password_reset_tokens` เก็บ **hash ของ token** ไม่ใช่ plaintext; หมดอายุ + ใช้ครั้งเดียว
- [ ] forgot-password ตอบเหมือนกันทุกกรณี (กัน email enumeration)
- [ ] rate-limit ที่ authorize/register/forgot
- [ ] validate password ขั้นต่ำ (ความยาว) ทั้ง client + server
- [ ] `authorize` รัน node runtime (bcrypt)
- [ ] `NEXTAUTH_SECRET` ตั้งจริง (จำเป็นมากตอนใช้ JWT)
- [ ] (แนะนำ) email verification ก่อนให้โพสต์

---

## 7. ลำดับการทำ
| ลำดับ | งาน |
|---|---|
| 1 | §1 สลับ session เป็น JWT + แก้ callback (แก้บั๊กพื้นฐาน) |
| 2 | §5 แก้หน้า signin โชว์ปุ่ม social + ตั้ง env LINE/Google → **ใช้ล็อกอินได้ทันที** |
| 3 | Email magic-link (ตั้ง `EMAIL_SERVER`) |
| 4 | §4 email/password: migration → bcrypt → CredentialsProvider → register → reset → rate-limit |
| 5 | §5 หน้า signup/forgot/reset + สไตล์ editorial |

---

## 8. Definition of Done
- [ ] ล็อกอิน LINE + Google ผ่าน (redirect กลับมามี session + `user.id`)
- [ ] magic-link ส่งอีเมลแล้วคลิกเข้าได้
- [ ] สมัคร email/password → ล็อกอินได้ → โพสต์ได้
- [ ] ลืมรหัส → รับอีเมล → รีเซ็ต → ล็อกอินด้วยรหัสใหม่ได้
- [ ] session ทำงานทุก provider เหมือนกัน (ทุก route ที่เช็ค `session.user.id` ใช้ได้)
- [ ] หน้า signin/signup เข้าชุดกับดีไซน์ editorial
- [ ] อ่าน `node_modules/next/dist/docs/` ยืนยัน syntax Next 16 + ตรวจ NextAuth v4 credentials + JWT ก่อนส่ง
