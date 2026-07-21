# Handover — Roadmap พัฒนาต่อ (สำหรับ Claude Code)

> เอกสารส่งงานให้ Claude Code ทำงานพัฒนาต่อบน **Style T-chai** ทีละงาน ไม่ต้องพึ่งกัน (ยกเว้น §1 = ของกลาง)
> อ้างอิงจากการสำรวจโค้ดจริง ณ 2026-07-15 — งานหลายอย่างใน `docs/security-review.md` **แก้ไปแล้ว** เอกสารนี้จึงโฟกัสสิ่งที่ยังเปิดอยู่จริง
> **หลักการ:** harden ก่อน → ทำฐานให้ "จริง" → แล้วค่อยขยายฟีเจอร์เติบโต

---

## 0. บริบท + conventions (อ่านก่อนเริ่ม)

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres + Storage + Auth adapter) · NextAuth v4 (JWT) · Stripe · Tailwind v4 · shadcn/ui · Google Gemini (`@google/genai`)

**⚠️ Next.js 16 (จาก `AGENTS.md`):** เวอร์ชันนี้มี breaking changes — อ่าน guide ใน `node_modules/next/dist/docs/` ก่อนแตะ routing / layout / route handler ทุกครั้ง โดยเฉพาะ `params` ที่เป็น `Promise`

**Conventions ที่มีอยู่ (ทำตาม อย่าคิดใหม่):**

```ts
// API route pattern เดิม
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ⚠️ params เป็น Promise ใน Next 16
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;          // ต้อง await
  const db = supabaseAdmin();           // service-role client (server-only, ข้าม RLS)
  const userId = session.user.id;
  // เช็ค membership/ownership เองทุกครั้ง (เพราะ service-role ข้าม RLS)
}
```

**กฎเหล็ก:**
- เรียก Gemini **ฝั่ง server เท่านั้น** — helper อยู่ที่ `src/lib/gemini.ts` (`geminiJSON`, `geminiEmbed`)
- `supabaseAdmin()` = service-role ข้าม RLS → ต้องเช็คสิทธิ์ในโค้ดเอง
- Storage bucket: `post-images` (public URL)
- ข้อความที่โชว์ผู้ใช้ = **ภาษาไทย**
- AI call ต้อง cache/กันเรียกซ้ำ + rate limit (`src/lib/aiRateLimit.ts` → `checkAiRateLimit(userId)`)
- ห้ามแตะ Stripe / auth flow เว้นแต่งานสั่งให้ทำ

**ตารางหลัก (จาก `src/lib/supabase.ts`):** `posts`, `users`, `groups`, `group_members`, `group_outfits`, `group_outfit_votes`, `group_theme_plans`, `subscriptions` (ดูรายละเอียดคอลัมน์ใน `docs/AI_FEATURES_HANDOVER.md` §0)

**migration:** เก็บไฟล์ SQL ใหม่ใน `migrations/` ต่อเลข (ล่าสุด `004_auth_credentials.sql`) แล้วรันบน Supabase

---

## 1. [P0] Security — verification pass + hardening ที่เหลือ

> ⚠️ **ส่วนใหญ่แก้แล้ว** งานหลักคือ "ยืนยันว่ายังปิดอยู่" + เก็บ hardening 2–3 จุดที่เหลือ อย่าไปรื้อของที่ทำงานถูกแล้ว

**ยืนยันว่ายังปิดอยู่ (ควรเป็นจริงทั้งหมด — ถ้าไม่ ให้แก้):**
- `src/lib/auth.ts` — dev CredentialsProvider ถูก gate ด้วย `NODE_ENV !== "production" && DEV_PASSWORD` ✓
- `src/app/api/posts/route.ts` — upload มี `ALLOWED_MIME` allow-list + cap 10 MB, error คืนข้อความ generic, มี `checkAiRateLimit` ✓
- `src/app/api/groups/[id]/outfits/route.ts` — GET กรอง `moderation_status = 'approved'`, POST มี `checkAiRateLimit` ✓
- `src/app/api/users/search/route.ts` — strip `,():'"`, ใช้ `.ilike`, คืนแค่ `id, name, image` (ไม่คืน email) ✓
- `src/lib/gemini.ts` — `validateImageUrl` จำกัด host เป็น `*.supabase.(co|in)`, https, cap ขนาด ✓
- `next.config.ts` — มี CSP + security headers ครบ ✓

**งานที่ยังเหลือจริง (ทำ):**

1. **Validate `image_url` ที่ "เก็บลง DB" ในกลุ่ม** — `groups/[id]/outfits/route.ts` (POST) รับ `image_url` จาก body แล้ว insert ตรง ๆ. `gemini.validateImageUrl` กัน SSRF ตอน fetch แล้ว แต่ค่าที่ "เก็บ" ยังเป็น URL อะไรก็ได้
   → เพิ่ม guard ก่อน insert: อนุญาตเฉพาะ URL บน Supabase storage host ของเราเอง (reuse regex เดียวกับ `gemini.ts`) มิฉะนั้น `400`. ทางที่ดีกว่า: ให้ client อัปโหลดผ่าน `post-images` bucket เหมือน `/api/posts` แล้วส่งเฉพาะ path
2. **Prompt-injection hardening** — ใน `src/lib/moderation.ts` / `outfitFeedback.ts` caption ถูก interpolate เข้า prompt ตรง ๆ
   → คั่น user content ด้วย delimiter ชัดเจน (เช่น `<user_caption>...</user_caption>`) + สั่งใน system ว่าห้ามทำตามคำสั่งที่อยู่ในนั้น; อย่าเชื่อ verdict ล้วน ๆ ถ้ามีเกณฑ์ deterministic เสริมได้
3. **(option) RLS เป็น enforcement จริง** — `migrations/003_rls_policies.sql` เปิด RLS แล้ว แต่ทุก route ใช้ `supabaseAdmin()` (service-role ข้าม RLS) → RLS เป็นแค่ defense-in-depth ระดับ DB. ถ้าต้องการให้ DB บังคับสิทธิ์จริง ต้องมี user-scoped client (anon + user JWT) สำหรับ read/write ของ user เอง แล้วสงวน `supabaseAdmin()` ไว้เฉพาะ cron/webhook/admin — **งานใหญ่ ทำเป็นรอบแยกได้**

**DoD:** image_url นอก storage host ของเราถูกปฏิเสธ; caption ที่ฝังคำสั่ง ("ignore previous...") ไม่เปลี่ยน verdict; `npm run build` + `lint` ผ่าน

---

## 2. [P1] ย้าย data fetching หน้าหลัก → Server Components

### ปัญหา
`feed`, `groups`, `groups/[id]`, `subscription`, `profile` เป็น `"use client"` แล้ว `fetch()` ใน `useEffect` หลัง hydration → LCP ช้า, request waterfall, SEO/LLM มองไม่เห็นคอนเทนต์

### เป้าหมาย
ดึงข้อมูล initial ใน Server Component (บนเซิร์ฟเวอร์) แล้วส่ง props ให้ client component ที่เหลือทำเฉพาะ interactivity (filter, modal, optimistic update)

### แนวทาง (ทำทีละหน้า)
โครง: `page.tsx` = **server component** (async, ดึงข้อมูล) → render `<FeedClient initial={...} />` = **client component** (state/filter/handler เดิม)

```tsx
// src/app/feed/page.tsx  (เอา "use client" ออก, ทำเป็น async server component)
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const session = await getServerSession();
  const db = supabaseAdmin();
  // ดึง initial posts บน server (logic เดียวกับ GET /api/posts เดิม)
  const { data } = await db.from("posts").select("*, users(name, image)")
    .contains("visibility", ["explore"]).eq("moderation_status", "approved")
    .order("created_at", { ascending: false }).limit(24);
  return <FeedClient initialPosts={data ?? []} userId={session?.user?.id ?? null} />;
}
```

```tsx
// src/app/feed/FeedClient.tsx  (ย้าย logic เดิมของ feed/page.tsx มาที่นี่ + "use client")
"use client";
export default function FeedClient({ initialPosts, userId }) {
  const [ideas, setIdeas] = useState(initialPosts);   // มีข้อมูลตั้งแต่ render แรก
  // filter/handler เดิมทั้งหมด ... fetch เพิ่มเฉพาะตอน load-more / mutate
}
```

### หมายเหตุ
- ดึง data ตรงจาก `supabaseAdmin()` ใน server component ได้เลย (ไม่ต้องเรียก API ตัวเอง) — เร็วกว่า
- คง API routes ไว้สำหรับ mutation (POST/PATCH/DELETE) และ load-more
- **ถอด mock data ออกจากเส้นทางจริง**: `feed` ใช้ `MOCK_FOLLOWING_IDEAS`, และ `likes`/`bookmarks`/`page`/`post` ใช้ `mockData` → แทนด้วยข้อมูลจริง (ผูกกับ §3) เก็บ mock ไว้ได้เฉพาะ dev/seed
- ทำหน้าที่ traffic สูงก่อน: `feed` → `groups`/`groups/[id]` → `profile` → `subscription`

**DoD:** view-source ของ `/feed` มีเนื้อโพสต์จริง (ไม่ใช่หน้าว่างรอ JS); ไม่มี `mockData` ใน render path จริง; interactivity (filter/delete/edit) ยังทำงาน

---

## 3. [P1] ทำ likes / bookmarks / follow ให้ "จริง" ใน DB

### ปัญหา
- `likes`/`bookmarks` เก็บใน `localStorage` (ดู `src/app/likes/page.tsx`, `bookmarks/page.tsx`)
- ค่า `likes: 0, saves: 0` ถูก **hardcode** ใน `src/app/api/posts/route.ts`
- **ไม่มีระบบ follow เลย** — ฟีด "คนที่ติดตาม" เป็น mock

### migration — `migrations/005_social_graph.sql`
```sql
create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create table if not exists post_saves (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create table if not exists user_follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists post_likes_user_idx on post_likes(user_id);
create index if not exists post_saves_user_idx on post_saves(user_id);
create index if not exists user_follows_follower_idx on user_follows(follower_id);
```

### API routes ใหม่ (ตาม pattern §0)
- `POST/DELETE src/app/api/posts/[id]/like/route.ts` — toggle like (upsert / delete จาก `post_likes`)
- `POST/DELETE src/app/api/posts/[id]/save/route.ts` — toggle bookmark (`post_saves`)
- `POST/DELETE src/app/api/users/[id]/follow/route.ts` — follow/unfollow (`user_follows`)
- `GET src/app/api/posts/saved/route.ts` และ `.../liked/route.ts` — คืนโพสต์ที่ user save/like (แทน localStorage)

### แก้ที่มีอยู่
- `GET /api/posts` (`route.ts`): เลิก hardcode `likes:0/saves:0` → นับจริงจาก `post_likes`/`post_saves` (aggregate) + `_liked`/`_saved` ของ viewer (ทำแบบเดียวกับ `votes_count`/`_voted` ใน group outfits)
- `feed` community/following: query จริงจาก `user_follows` (`following_id in (...)`) แทน `MOCK_FOLLOWING_IDEAS`
- `src/app/likes/page.tsx` + `bookmarks/page.tsx`: อ่านจาก API ใหม่ (เป็น server component ตาม §2) เลิกใช้ `localStorage`
- `OutfitCard`: ต่อปุ่ม ♡ / bookmark เข้ากับ route ใหม่ + optimistic update

**DoD:** like/save persist ข้ามอุปกรณ์ (ไม่ใช่แค่เบราว์เซอร์เดิม); ตัวเลข likes/saves ตรงกับ DB; follow แล้วโพสต์ของคนนั้นโผล่ในฟีด "ติดตาม"; ไม่มี `localStorage` ใน likes/bookmarks อีก

---

## 4. [P2] loading / error / not-found boundaries

### ปัญหา
ไม่มี `loading.tsx` / `error.tsx` / `not-found.tsx` เลย + error ถูกกลืนเงียบ (`.catch(() => {})` ใน `feed/page.tsx`)

### งาน
- เพิ่ม `src/app/loading.tsx` (skeleton รวม) + per-route ที่ช้า เช่น `feed/loading.tsx`, `groups/[id]/loading.tsx` — ใช้ token editorial (`bg-surface`, `rounded-card`) ทำ skeleton การ์ด
- เพิ่ม `src/app/error.tsx` (client component, มีปุ่ม "ลองใหม่" เรียก `reset()`) + `not-found.tsx`
- ใน client fetch: เลิก `.catch(() => {})` เปล่า → เก็บ error state แล้วโชว์ UI ("โหลดไม่สำเร็จ ลองใหม่")
- เมื่อย้ายเป็น server component (§2) แล้ว boundary พวกนี้จะทำงานกับ streaming อัตโนมัติ

**DoD:** ปิด network แล้วเปิด `/feed` เห็น error UI ไม่ใช่หน้าว่าง; ระหว่างโหลดเห็น skeleton; route มั่ว → not-found

---

## 5. [P2] รูปภาพ + pagination

- แทน `<img>` ดิบใน `src/app/groups/[id]/page.tsx` (2 จุด: ~บรรทัด 336, 659) ด้วย `next/image` + `sizes` + `blurDataURL` (host `*.supabase.co`/`images.unsplash.com` อยู่ใน `next.config.ts` remotePatterns แล้ว)
- ตรวจทั้งแอปให้ใช้ `next/image` (ตอนนี้แค่ ~6 จุด) + `placeholder="blur"` สำหรับรูปหลัก
- **Pagination:** `GET /api/posts` hard-cap `.limit(50)` → เพิ่ม cursor (`created_at` + `id`) หรือ `range()` + infinite scroll ที่ feed (IntersectionObserver) โหลดทีละ ~24

**DoD:** ไม่มี `<img>` ดิบใน `src/`; feed โหลดเพิ่มได้เกิน 50 โพสต์; Lighthouse LCP ดีขึ้นจากรูป optimize

---

## 6. [P3] Discovery & Personalization (Feature D)

> รายละเอียดเต็มมีอยู่แล้วใน `docs/AI_FEATURES_HANDOVER.md` §5 — **ยังไม่ได้ทำ** (helper `geminiEmbed()` มีแล้วแต่ไม่ถูกเรียก, ไม่มี route search/for-you, ไม่มี migration pgvector)

สรุปงานตามเอกสารนั้น:
1. migration: `create extension vector` + `posts.embedding` + `user_taste` + ฟังก์ชัน `match_posts` — **เช็คมิติ vector จริงของ `GEMINI_EMBED_MODEL` แล้วแก้เลข `768` ให้ตรง**
2. สร้าง embedding ตอนโพสต์ (ใน `POST /api/posts` หลัง insert) + `scripts/backfill-embeddings.ts` สำหรับของเก่า
3. อัปเดต `user_taste` เมื่อ user like/save (ผูกกับ §3 — ตอนนี้มี like/save จริงแล้วพอดี)
4. `GET /api/feed/foryou` (fallback เป็น created_at ถ้ายังไม่มี taste) + `GET /api/search?q=` (semantic)
5. UI: แท็บ "For You" ในฟีด + ช่องค้นหาแบบพิมพ์ประโยค

**ทำหลัง §3 เสร็จ** (ต้องมี like/save จริงก่อน taste ถึงจะมีความหมาย) และเมื่อข้อมูลจริงมากพอ ivfflat ถึงแม่น

**DoD:** ตามเกณฑ์ใน `AI_FEATURES_HANDOVER.md` §5

---

## 7. [P3] Notifications + digest email

### Notifications
- migration `migrations/006_notifications.sql`: ตาราง `notifications (id, user_id, type, actor_id, entity_type, entity_id, read boolean, created_at)`
- สร้าง notification (insert แบบ non-blocking `void db...`) ตอน: มีคน like/vote โพสต์เรา, ได้ AI feedback, ถูกเชิญเข้ากลุ่ม
- `GET /api/notifications` + `POST .../read` + badge นับ unread ใน `Navbar`

### Digest email (ต่อของเดิมให้ครบ)
- `src/app/api/cron/weekly-digest/route.ts` + `src/lib/weeklyDigest.ts` สร้าง digest ลง DB แล้ว แต่ **ยังไม่ส่งอีเมล**
- ต่อ `nodemailer` (ติดตั้งแล้ว, ใช้ pattern เดียวกับ `src/app/api/auth/forgot-password/route.ts`) ส่ง digest ให้สมาชิกกลุ่มที่ opt-in
- ตรวจ `vercel.json` cron schedule (`0 1 * * 1`) ยังตรง

**DoD:** like/vote → เจ้าของโพสต์เห็น notification; badge unread ลดเมื่ออ่าน; ยิง cron แล้วสมาชิกได้อีเมล digest (ตัวเลขตรง DB)

---

## 8. ลำดับการทำ (แนะนำ)

| ลำดับ | งาน | Effort | ผลกระทบ |
|---|---|---|---|
| 1 | §1 Security verify + hardening | S–M | สูงมาก (กันก่อนโต) |
| 2 | §2 Server Components (feed→groups→profile) | M | สูง (speed + SEO/AI) |
| 3 | §3 likes/bookmarks/follow จริง | M | สูง (แกนโซเชียล) |
| 4 | §4 loading/error boundaries | S | กลาง |
| 5 | §5 images + pagination | S–M | กลาง |
| 6 | §7 notifications + digest email | M | กลาง–สูง |
| 7 | §6 Discovery & Personalization | L | สูง (ทำท้าย) |

*Effort: S ≈ 0.5–1 วัน · M ≈ 1–3 วัน · L ≈ 3–5 วัน (dev คนเดียว, ประมาณคร่าว ๆ)*

§2 กับ §3 แนะนำทำคู่กัน (ยกทั้งความเร็วและความน่าเชื่อถือพร้อมกัน)

---

## 9. Checklist ปิดงาน (ทุกงาน)
- [ ] อ่าน `node_modules/next/dist/docs/` ยืนยัน syntax Next 16 (route/params/layout) ก่อนแก้
- [ ] `params` await แล้ว, ทุก route เช็ค `session` + membership/ownership
- [ ] Gemini เรียกฝั่ง server เท่านั้น + มี rate limit + cache
- [ ] ข้อความผู้ใช้เป็นภาษาไทย, degrade อย่างปลอดภัยเมื่อ AI/DB ล่ม
- [ ] migration ใหม่รันบน Supabase + เก็บไฟล์ใน `migrations/`
- [ ] ไม่มี mock data / localStorage หลงเหลือใน render path จริง
- [ ] `npm run build` + `npm run lint` ผ่าน
