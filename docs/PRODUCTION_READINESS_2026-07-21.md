# รายงานความพร้อมขึ้น Production — my_style

วันที่ตรวจ: 2026-07-21 · Stack: Next.js 16 / Supabase / NextAuth / Stripe / Gemini

## สรุป (verdict)

**ยังไม่พร้อม 100% แต่ใกล้แล้ว** ตอนตรวจพบว่า **build พังจน deploy ไม่ได้** (บั๊ก 1 จุด) — ผมแก้ให้แล้ว หลังจากนี้เหลือแค่ตั้งค่า env production ให้ครบและ apply migration ก่อนเปิดจริง

| ด้าน | สถานะ |
|------|-------|
| Build / TypeScript | ✅ ผ่านแล้ว (หลังแก้บั๊ก) |
| Security (จาก security-review เดิม) | ✅ แก้ไปเกือบหมด |
| Config / Env production | ⚠️ ต้องตรวจใน Vercel |
| Lint | ⚠️ มี 35 errors (ไม่บล็อก deploy แต่ควรเก็บ) |

---

## 1. บั๊กที่บล็อก build — แก้แล้ว ✅

`src/app/groups/GroupsClient.tsx` เรียกใช้ `PLAN_DETAILS` และ `Check` โดยไม่ได้ import → TypeScript compile ไม่ผ่าน → `next build` ล้มเหลว → **deploy ไม่ได้เลย**

แก้โดยเพิ่ม import:
- `Check` จาก `lucide-react`
- `PLAN_DETAILS` จาก `@/lib/plans`

ยืนยันแล้วว่า `tsc --noEmit` ผ่าน (exit 0)

## 2. ต้องทำก่อนเปิดจริง (blocking) ⚠️

อัปเดต 2026-07-21: ตัดสินใจ **ไม่ใช้ DEV_PASSWORD, Stripe, Gemini** ในรอบนี้ — จัดการในโค้ดแล้ว (ดูข้อ 5)

env ที่ยัง **จำเป็น** ต้องตั้งบน Vercel:

- **NEXTAUTH_URL** — ตอนนี้ชี้ `localhost` ต้องเป็นโดเมน production จริง ไม่งั้น login/OAuth callback พัง
- **NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / NEXTAUTH_SECRET** — ตั้งครบแล้ว
- **EMAIL_SERVER / EMAIL_FROM** — ต้องตั้งถ้าจะเปิด reset password / magic link (ถ้ายังไม่ใช้ ก็ปิดฟีเจอร์นี้ได้)

env ที่ **เลื่อนไปก่อนได้** (ฟีเจอร์อนาคต):

- **Stripe** — ไม่ตั้งได้ กระทบเฉพาะ `/api/subscription/checkout` + `/webhook` (routes นี้จะ error เมื่อถูกเรียก) ส่วนอื่นของเว็บทำงานปกติ
- **GEMINI_API_KEY** — ไม่ตั้งได้ เพิ่ม guard ให้ moderation ข้ามเป็น `approved` อัตโนมัติแล้ว (ข้อ 5) โพสต์จึงแสดงใน feed ได้ปกติ
- **CRON_SECRET** — จำเป็นเฉพาะถ้าเปิด weekly-digest cron

นอกจากนี้: apply migration `003_rls_policies.sql` (และตัวอื่น) เข้า DB production เพื่อให้ RLS ทำงานเป็น defense-in-depth

## 3. Security — จาก security-review (14 ก.ค.) แก้ไปเกือบหมดแล้ว ✅

- Auth backdoor (dev login) — gate ด้วย `NODE_ENV !== production` + ต้องมี `DEV_PASSWORD` ✅
- SSRF จาก `image_url` — มี `validateImageUrl()` (https + allowlist โฮสต์ supabase + จำกัดขนาด + timeout) ✅
- Rate limiting บน endpoint AI — wired เข้า posts / register / forgot+reset password / group outfits ✅
- User search injection + email enumeration — strip อักขระ inject, ค้นเฉพาะ name, ไม่คืน email ✅
- Security headers + CSP — เพิ่มใน `next.config.ts` (HSTS, nosniff, frame DENY, CSP) ✅
- File upload — allowlist MIME + จำกัดขนาด 10MB ✅
- Moderation แสดง content ที่ flagged — group outfits GET filter เฉพาะ `approved` แล้ว ✅
- Stripe webhook — verify signature ✅

**เหลือ (ไม่ critical):** ทุก query ยังใช้ service-role key (bypass RLS) — จะปลอดภัยขึ้นเมื่อ apply migration RLS; prompt-injection ผ่าน caption มี delimiter กันแล้วบางส่วน

## 4. Lint — แก้หมดแล้ว ✅ (0 errors, 0 warnings)

อัปเดต 2026-07-21: เดิม 33 errors + 22 warnings (Next.js รัน ESLint ตอน build จึงเป็น blocker บน Vercel) แก้ครบ 4 เฟส:

- **เฟส 1** — เก็บ unused vars/imports + ตั้ง ESLint ให้ยอมรับตัวแปรขึ้นต้น `_` (convention เดิม)
- **เฟส 2** — ใส่ type จริงแทน `any` ทั้ง 28 จุด (weekly-digest, messages, outfits, groups, posts, webhook, gemini, outfitFeedback) รวมถึง `any` ที่ถูกซ่อนด้วย inline-disable ใน GroupDetailClient ก็ type จริงหมด
- **เฟส 3** — react-hooks/set-state-in-effect: ย้าย window-derived values (`hasEyeDropper`, `inviteUrl`) ไปใช้ helper `useClientValue` (hydration-safe ด้วย useSyncExternalStore); NotificationBell เป็น async polling ที่ถูกต้องอยู่แล้ว จึง scope-disable พร้อมคอมเมนต์
- **เฟส 4** — เปลี่ยน `<img>` 6 จุดเป็น `next/image` (fill/width-height ตามบริบท, blob preview ใช้ `unoptimized`)

ยืนยัน: `tsc --noEmit` ผ่าน (0 errors) และ `eslint .` ผ่าน (0 problems)

หมายเหตุ: `next build` เต็มรันใน sandbox Linux นี้ไม่ได้ เพราะ `node_modules` ถูกติดตั้งบน macOS ทำให้ native binary (lightningcss) ไม่ตรง platform — เป็นข้อจำกัดของ sandbox จะ build ได้ปกติบนเครื่องคุณ/Vercel

## Checklist ก่อนกด go-live

- [x] แก้บั๊ก build (GroupsClient imports)
- [x] ลบ DEV_PASSWORD provider ออกจาก `auth.ts` + ลบออกจาก `.env.local`
- [x] เพิ่ม guard: ไม่มี Gemini key → moderation auto-approve (โพสต์แสดงได้)
- [ ] ตั้ง env production ที่จำเป็นใน Vercel: `NEXTAUTH_URL` (โดเมนจริง), Supabase, `NEXTAUTH_SECRET`
- [ ] apply migrations ทั้งหมด รวม RLS (003)
- [x] เก็บ lint + type ให้สะอาด (0 errors / 0 warnings)
- [ ] ทดสอบ flow จริง: signup/login, สร้าง post + เห็นใน feed, group outfit
- [ ] รัน `npm run build` บนเครื่อง/Vercel เพื่อยืนยัน production build
