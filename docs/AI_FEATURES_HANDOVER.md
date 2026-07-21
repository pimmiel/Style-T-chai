# AI Features — Handover สำหรับ Claude Code

> เอกสารส่งงานเพื่อให้ Claude Code (หรือ dev) implement ฟีเจอร์ AI 4 ตัวใน Style T-chai
> **Provider:** Google Gemini (`@google/genai`)
> เขียนไว้ให้ทำได้ทีละฟีเจอร์ ไม่ต้องพึ่งกัน (ยกเว้น Section 1 = ของกลางที่ทุกฟีเจอร์ใช้)

---

## 0. บริบทโปรเจกต์ (อ่านก่อนเริ่ม)

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres + Storage + Auth adapter) · NextAuth v4 · Stripe · Tailwind v4 · shadcn/ui

**⚠️ Next.js 16 warning (จาก `AGENTS.md`):** เวอร์ชันนี้มี breaking changes จากที่คุ้นเคย — อ่าน guide ใน `node_modules/next/dist/docs/` ก่อนเขียน route/API ใหม่ทุกครั้ง โดยเฉพาะเรื่อง route handler และ `params` ที่เป็น `Promise`

**Conventions ที่มีอยู่ ต้องทำตาม (อย่าคิดใหม่):**

```ts
// ทุก API route ใช้ pattern นี้
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ⚠️ params เป็น Promise ใน Next 16
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;              // ต้อง await
  const db = supabaseAdmin();               // service-role client (server-only)
  const userId = session.user.id;

  // ตรวจ membership ก่อนทำงานกับ group เสมอ
  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  // ...
}
```

**กฎเหล็ก:**
- เรียก Gemini **ฝั่ง server เท่านั้น** (route handler / server action) — ห้ามให้ API key ไป client เด็ดขาด
- Storage bucket ชื่อ `post-images` (public URL) — ใช้ตัวเดิม
- `supabaseAdmin()` คือ service-role ข้าม RLS — เช็คสิทธิ์ในโค้ดเองทุกครั้ง

**ตารางหลักที่เกี่ยวข้อง** (จาก `src/lib/supabase.ts`):

| ตาราง | คอลัมน์สำคัญ |
|---|---|
| `posts` | `id, user_id, post_type('outfit'|'tip'|'lookbook'), visibility text[], image_url, caption, style_tag, occasion_tag, gender_tag, colors jsonb, title, body, tags, created_at` |
| `users` | `id, name, email, image` |
| `groups` | `id, name, owner_id, invite_code, max_members` |
| `group_members` | `id, group_id, user_id, role('owner'|'member')` |
| `group_outfits` | `id, group_id, user_id, image_url, caption, colors jsonb, created_at` |
| `group_outfit_votes` | `group_outfit_id, user_id` (unique pair) |
| `group_theme_plans` | `id, group_id, plan_date, theme_name, colors jsonb, occasion, notes, created_by` |
| `subscriptions` | `user_id, plan_type(2|5|10), status('active'|'canceled'|'past_due')` |

---

## 1. ของกลาง (Shared foundations) — ทำก่อนทุกฟีเจอร์

### 1.1 Env vars (เพิ่มใน `.env.local` และ `.env.local.example`)

```bash
# Gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash            # ตัวหลัก (มี vision) — อัปเป็น gemini-3.5-flash ได้ถ้าต้องการคุณภาพสูงขึ้น
GEMINI_EMBED_MODEL=gemini-embedding-001  # ใช้เฉพาะ Feature 4 (discovery)

# สำหรับ cron ของ Feature 3 (weekly summary)
CRON_SECRET=generate-random-secret
```

### 1.2 ติดตั้ง SDK

```bash
npm install @google/genai
```

> หมายเหตุ: `@google/genai` คือ SDK ปัจจุบัน (แทน `@google/generative-ai` ตัวเก่า). โมเดล `gemini-2.5-flash` รองรับ text + image. เช็ค deprecation ก่อน pin เวอร์ชันโมเดล (ตัว preview เก่าถูกปลดระวางต่อเนื่อง)

### 1.3 Gemini client helper — สร้างไฟล์ `src/lib/gemini.ts`

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** เรียก Gemini แล้วบังคับให้ตอบเป็น JSON ตาม schema ที่กำหนด */
export async function geminiJSON<T>(opts: {
  system?: string;
  prompt: string;
  imageUrl?: string;          // ถ้ามี = ส่งรูปเข้าไปวิเคราะห์ด้วย (vision)
  responseSchema: object;     // JSON schema ของผลลัพธ์ที่ต้องการ
}): Promise<T> {
  const parts: any[] = [{ text: opts.prompt }];

  if (opts.imageUrl) {
    const res = await fetch(opts.imageUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    parts.unshift({
      inlineData: {
        mimeType: res.headers.get("content-type") ?? "image/jpeg",
        data: buf.toString("base64"),
      },
    });
  }

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
      temperature: 0.4,
    },
  });

  return JSON.parse(result.text ?? "{}") as T;
}

/** สร้าง embedding vector สำหรับ Feature 4 */
export async function geminiEmbed(text: string): Promise<number[]> {
  const r = await ai.models.embedContent({
    model: process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001",
    contents: text,
  });
  return r.embeddings?.[0]?.values ?? [];
}
```

### 1.4 Premium gating helper — สร้าง `src/lib/entitlement.ts`

```ts
import { supabaseAdmin } from "@/lib/supabase";

/** true = user มี subscription active (ใช้ล็อกฟีเจอร์ AI ระดับ premium) */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}
```

### 1.5 หลักการที่ทุกฟีเจอร์ต้องทำ (อย่าลืม)

- **Rate limit + cache:** อย่าเรียก Gemini ซ้ำสำหรับ input เดิม — เก็บผลลง DB แล้วอ่านซ้ำ
- **Fail gracefully:** ถ้า Gemini ล่ม/timeout ต้องไม่ทำให้ flow หลัก (อัปโหลด/โหวต) พัง — จับ error, log, แล้วปล่อยผ่าน (degrade)
- **ภาษา:** prompt สั่งให้ตอบ **ภาษาไทย** สำหรับข้อความที่โชว์ผู้ใช้ (feedback, summary, tips)
- **Cost control:** ใช้ `gemini-2.5-flash` (ถูก/เร็ว) เป็น default; งานหนัก/premium ค่อยขยับโมเดล

---

## 2. Feature A — Trust & Safety (Content Moderation)

### เป้าหมาย
กรองรูป + ข้อความที่ไม่เหมาะสมก่อนขึ้น feed หรือเข้ากลุ่ม กัน NSFW / ความรุนแรง / hate / สแปม โดยเฉพาะเพราะกลุ่มมี invite link ให้คนนอกเข้าได้

### Data model (migration)

```sql
-- moderation verdict เก็บติดกับ content
alter table posts        add column if not exists moderation_status text default 'pending';  -- pending|approved|rejected|flagged
alter table posts        add column if not exists moderation_reason text;
alter table group_outfits add column if not exists moderation_status text default 'pending';
alter table group_outfits add column if not exists moderation_reason text;

-- audit log (option แต่แนะนำ)
create table if not exists moderation_logs (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,          -- 'post' | 'group_outfit'
  content_id uuid not null,
  status text not null,
  reason text,
  categories jsonb,                    -- {sexual, violence, hate, spam, ...}
  created_at timestamptz default now()
);
```

### ตัวช่วย — `src/lib/moderation.ts`

```ts
import { geminiJSON } from "@/lib/gemini";

export type ModerationVerdict = {
  status: "approved" | "rejected" | "flagged";
  reason: string;                      // ภาษาไทยสั้น ๆ
  categories: { sexual: number; violence: number; hate: number; spam: number }; // 0..1
};

const SYSTEM = `คุณเป็นระบบตรวจสอบเนื้อหาของแอปแฟชั่น
ตรวจรูปและข้อความว่าเหมาะกับพื้นที่ social ทั่วไปไหม
- approved: ปลอดภัย
- flagged: ก้ำกึ่ง ควรให้คนรีวิว
- rejected: ชัดเจนว่าผิด (โป๊เปลือย, ความรุนแรง, hate speech, สแปม/โฆษณา)
ให้เหตุผลเป็นภาษาไทยสั้น ๆ`;

export async function moderate(input: { caption?: string; imageUrl?: string }) {
  return geminiJSON<ModerationVerdict>({
    system: SYSTEM,
    imageUrl: input.imageUrl,
    prompt: `ตรวจเนื้อหานี้. caption: "${input.caption ?? "(ไม่มี)"}"`,
    responseSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["approved", "rejected", "flagged"] },
        reason: { type: "string" },
        categories: {
          type: "object",
          properties: {
            sexual: { type: "number" }, violence: { type: "number" },
            hate: { type: "number" }, spam: { type: "number" },
          },
          required: ["sexual", "violence", "hate", "spam"],
        },
      },
      required: ["status", "reason", "categories"],
    },
  });
}
```

### จุด integrate
- **`src/app/api/posts/route.ts` (POST)** — หลัง upload รูปได้ `image_url` แล้ว **ก่อน** `insert` เรียก `moderate()`
  - `rejected` → ไม่ insert, return `422` พร้อม `reason`, ลบรูปที่เพิ่งอัปออกจาก bucket
  - `flagged` → insert แต่ set `moderation_status='flagged'` และ **ไม่โชว์ใน feed** (ดูข้อถัดไป)
  - `approved` → set `moderation_status='approved'` ตามปกติ
- **`src/app/api/groups/[id]/outfits/route.ts` (POST)** — ทำแบบเดียวกันกับ `group_outfits`
- **GET feed** (`posts` GET) — เพิ่ม filter `.eq("moderation_status", "approved")` ใน branch `explore`
- เขียน log ลง `moderation_logs` ทุกครั้ง

### Edge cases
- Gemini timeout/error → default เป็น `flagged` (ให้คนรีวิว) ไม่ใช่ approved — ปลอดภัยไว้ก่อน
- รูปใหญ่ → ย่อก่อนส่ง (base64 มี overhead) หรือใช้ Supabase image transform
- ทำเป็น non-blocking ได้ถ้าอยากให้ upload เร็ว: insert เป็น `pending` ก่อน แล้ว moderate แบบ async (เช่น ผ่าน route แยก / edge function) แล้ว update status — แต่ MVP ทำ inline ก่อนได้

### เกณฑ์ทดสอบ (Definition of Done)
- อัปรูปปกติ → approved, ขึ้น feed
- อัปแคปชันหยาบคาย → rejected, ไม่ขึ้น feed, รูปถูกลบ
- ปิด `GEMINI_API_KEY` แล้ว upload flow ต้องไม่ crash (degrade เป็น flagged)

---

## 3. Feature B — AI Feedback ตอนโหวต Outfit ในกลุ่ม

### เป้าหมาย
เพิ่ม engagement ในกลุ่ม: ให้ AI คอมเมนต์เชิงสร้างสรรค์ต่อ outfit แต่ละชุด และ/หรือ สรุปว่าทำไมชุดที่ได้โหวตสูงถึงเวิร์ก — โยงกับ `group_theme_plans` ของวันนั้นได้ (เข้าธีมไหม)

### Data model (migration)

```sql
alter table group_outfits add column if not exists ai_feedback text;           -- คอมเมนต์ภาษาไทย
alter table group_outfits add column if not exists ai_feedback_at timestamptz;
```

### ตัวช่วย — `src/lib/outfitFeedback.ts`

```ts
import { geminiJSON } from "@/lib/gemini";

const SYSTEM = `คุณเป็นสไตลิสต์ที่ให้ฟีดแบ็กแบบสุภาพ กระชับ สร้างสรรค์
ชมจุดเด่นก่อน แล้วเสนอ 1 จุดที่ปรับได้ อ้างอิงหลัก color theory และความเข้ากับธีม/โอกาส
ห้ามตัดสินรูปร่างหรือหน้าตาบุคคล พูดถึงเฉพาะเสื้อผ้า/สี/การแมตช์
ตอบภาษาไทย ไม่เกิน 2 ประโยค`;

export async function outfitFeedback(input: {
  imageUrl: string;
  caption?: string;
  theme?: { theme_name: string; occasion?: string | null; colors?: any } | null;
}) {
  const themeLine = input.theme
    ? `ธีมของวันนี้: ${input.theme.theme_name}${input.theme.occasion ? ` (โอกาส: ${input.theme.occasion})` : ""}`
    : "ไม่มีธีมกำหนด";
  return geminiJSON<{ feedback: string; theme_fit: number }>({
    system: SYSTEM,
    imageUrl: input.imageUrl,
    prompt: `caption: "${input.caption ?? "(ไม่มี)"}"\n${themeLine}\nให้ feedback และคะแนนความเข้าธีม 0-100`,
    responseSchema: {
      type: "object",
      properties: { feedback: { type: "string" }, theme_fit: { type: "number" } },
      required: ["feedback", "theme_fit"],
    },
  });
}
```

### จุด integrate — สร้าง route ใหม่
`src/app/api/groups/[id]/outfits/[outfitId]/feedback/route.ts` (POST)
1. เช็ค session + membership (ตาม pattern §0)
2. โหลด `group_outfits` row (image_url, caption) + หา `group_theme_plans` ของ `plan_date = today` ในกลุ่มนั้น
3. ถ้ามี `ai_feedback` แล้ว → return ตัวเดิม (cache, ไม่เรียกซ้ำ)
4. เรียก `outfitFeedback()` → `update group_outfits set ai_feedback, ai_feedback_at`
5. return `{ feedback, theme_fit }`

**UI:** ในหน้า group (`src/app/groups/[id]/page.tsx`) + `OutfitCard`/component โหวต เพิ่มปุ่ม "ขอความเห็นจากสไตลิสต์ AI" ที่เรียก route นี้ แล้วโชว์ผลใต้การ์ด

### ตัวเลือกเสริม (ทำทีหลังได้)
- **สรุปผู้ชนะ:** route `GET .../summary` รวมชุดที่โหวตสูงสุดของรอบ แล้วให้ AI อธิบายว่าทำไมถึงชนะ
- **Gating:** จำกัดจำนวน feedback/วัน สำหรับ user ที่ไม่ได้ subscribe (ใช้ `hasActiveSubscription`)

### เกณฑ์ทดสอบ
- กดขอ feedback → ได้ข้อความไทย ≤2 ประโยค ไม่พูดถึงรูปร่างบุคคล
- กดซ้ำ → คืนค่าเดิมจาก DB ไม่เรียก Gemini ใหม่
- outfit ที่ไม่ตรงธีม → `theme_fit` ต่ำ

---

## 4. Feature C — สรุปประจำสัปดาห์ของกลุ่ม (Weekly Digest)

### เป้าหมาย
งานอัตโนมัติ (cron) สรุป outfit เด่น + เทรนด์สีของแต่ละกลุ่มในรอบ 7 วัน ส่ง/เก็บเป็น digest เพื่อดึงคนกลับเข้าแอป

### Data model (migration)

```sql
create table if not exists group_weekly_digests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  week_start date not null,
  summary text not null,               -- สรุปภาษาไทย
  top_outfit_ids uuid[],
  color_trends jsonb,                  -- [{hex, label, count}]
  stats jsonb,                         -- {posts, votes, active_members}
  created_at timestamptz default now(),
  unique (group_id, week_start)
);
```

### ตัวช่วย — `src/lib/weeklyDigest.ts`
รวมข้อมูลดิบด้วย SQL/JS ก่อน (นับโหวต, จัดอันดับ, รวมสีจาก `group_outfits.colors`) **แล้วค่อยส่งให้ Gemini เขียนเป็นภาษาคน** — อย่าให้ Gemini คำนวณตัวเลขเอง

```ts
import { geminiJSON } from "@/lib/gemini";

const SYSTEM = `คุณเขียนสรุปรายสัปดาห์ของกลุ่มแฟชั่นให้สนุก เป็นกันเอง กระชับ
ใช้ข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลขเพิ่ม ตอบภาษาไทย 2-4 ประโยค`;

export async function writeDigest(data: {
  groupName: string;
  stats: { posts: number; votes: number; activeMembers: number };
  topOutfits: { caption: string; votes: number }[];
  colorTrends: { label: string; count: number }[];
}) {
  return geminiJSON<{ summary: string }>({
    system: SYSTEM,
    prompt: JSON.stringify(data),
    responseSchema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  });
}
```

### จุด integrate — cron route
`src/app/api/cron/weekly-digest/route.ts` (GET หรือ POST)
1. ตรวจ header `Authorization: Bearer ${CRON_SECRET}` (กันคนนอกยิง)
2. loop ทุก group ที่มี activity ในสัปดาห์:
   - นับ posts/votes/active members
   - จัดอันดับ top outfits (join `group_outfit_votes`)
   - รวมสีจาก `group_outfits.colors` → นับความถี่ → top color trends
3. เรียก `writeDigest()` → upsert ลง `group_weekly_digests` (unique `group_id, week_start`)
4. (option) ส่งอีเมลผ่าน `nodemailer` ที่ติดตั้งอยู่แล้ว

**ตั้งเวลา:** ใช้ Vercel Cron (`vercel.json`) หรือ Supabase scheduled function ยิงมาที่ route นี้ เช่นทุกจันทร์ 08:00

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 1 * * 1" }] }
```

**UI:** โชว์ digest ล่าสุดบนหน้า group เป็นการ์ด "สรุปสัปดาห์นี้"

### เกณฑ์ทดสอบ
- ยิง cron ด้วย secret ถูก → สร้าง digest ต่อกลุ่ม, ตัวเลขตรงกับ DB จริง
- ยิงโดยไม่มี secret → `401`
- กลุ่มไม่มี activity → ข้าม ไม่สร้าง row เปล่า

---

## 5. Feature D — Discovery & Personalization

### เป้าหมาย
จัดอันดับ/แนะนำ outfit ให้ตรงรสนิยมแต่ละคน + semantic search ("ชุดสีเอิร์ธโทนใส่ทำงาน") โดยใช้ embedding บน Supabase `pgvector`

### Data model (migration)

```sql
create extension if not exists vector;

-- embedding ของแต่ละโพสต์ (มิติขึ้นกับโมเดล embedding ที่ใช้ — ปรับเลขให้ตรง)
alter table posts add column if not exists embedding vector(768);

create index if not exists posts_embedding_idx
  on posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- โปรไฟล์รสนิยมผู้ใช้ (เวกเตอร์เฉลี่ยจากของที่ like/save)
create table if not exists user_taste (
  user_id uuid primary key,
  embedding vector(768),
  updated_at timestamptz default now()
);

-- ฟังก์ชันค้นด้วย vector similarity
create or replace function match_posts(query_embedding vector(768), match_count int)
returns table (id uuid, similarity float)
language sql stable as $$
  select id, 1 - (embedding <=> query_embedding) as similarity
  from posts
  where embedding is not null and moderation_status = 'approved'
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

> ⚠️ มิติ vector ต้องตรงกับ output ของ `GEMINI_EMBED_MODEL` — เช็คจริงแล้วแก้เลข `768` ให้ตรง (บางโมเดลได้ 1536/3072). ตั้งค่า output dimension ให้คงที่ทั้ง index และตอน query

### งานที่ต้องทำ

**(1) สร้าง embedding ตอนโพสต์** — ใน `posts` POST (§Feature A จุดเดียวกัน) หลัง insert:
- ประกอบข้อความ describe: `[style_tag, occasion_tag, gender_tag, caption, ชื่อสีจาก colors]` → `geminiEmbed()` → `update posts set embedding`
- backfill ของเก่าด้วย script ครั้งเดียว (`scripts/backfill-embeddings.ts`)

**(2) อัปเดต user_taste** — เมื่อ user like/save โพสต์ (หา route like/save ที่มีอยู่ หรือทำ trigger):
- คำนวณเวกเตอร์เฉลี่ยจาก embedding ของโพสต์ที่ user like/save ล่าสุด N ชิ้น → upsert `user_taste`

**(3) Personalized feed** — route ใหม่ `src/app/api/feed/foryou/route.ts`
- ดึง `user_taste.embedding` ของ user → `match_posts(taste, 50)` → คืนโพสต์เรียงตาม similarity
- fallback: ถ้ายังไม่มี taste (user ใหม่) → เรียงตาม `created_at` เหมือน feed เดิม

**(4) Semantic search** — route ใหม่ `src/app/api/search/route.ts?q=...`
- `geminiEmbed(q)` → `match_posts(qVec, 30)` → คืนผล
- cache embedding ของ query ยอดฮิตได้

**UI:** เพิ่มแท็บ "For You" ในหน้า feed + ช่องค้นหาแบบพิมพ์เป็นประโยค

### Edge cases
- โพสต์ไม่มี embedding (ยัง backfill ไม่ถึง) → ไม่โผล่ใน search/foryou แต่ยังอยู่ feed ปกติ
- ใช้ `moderation_status='approved'` เป็นเงื่อนไขใน `match_posts` (เชื่อมกับ Feature A)
- ivfflat ต้องมีข้อมูลพอถึงจะแม่น — ช่วงแรกที่ข้อมูลน้อยผลอาจกระโดด

### เกณฑ์ทดสอบ
- โพสต์ใหม่ → มี embedding ภายในไม่กี่วิ
- ค้น "ชุดสีเอิร์ธโทนใส่ทำงาน" → ได้ outfit โทนน้ำตาล/เบจ/ทางการมาก่อน
- user ที่ like ชุด minimal บ่อย → For You เอียงไปทาง minimal

---

## 6. ลำดับการทำ (แนะนำ) + ประเมินแรง

| ลำดับ | ฟีเจอร์ | Effort | ผลกระทบ | เหตุผล |
|---|---|---|---|---|
| 1 | §1 ของกลาง (Gemini client, env) | S | — | ทุกอย่างต้องใช้ |
| 2 | Feature A — Moderation | M | สูง | กันปัญหา trust & safety ก่อนโต |
| 3 | Feature B — Voting feedback | S–M | กลาง–สูง | ดัน engagement, dependency น้อย |
| 4 | Feature C — Weekly digest | M | กลาง | ต้องตั้ง cron + retention play |
| 5 | Feature D — Discovery | L | สูง | หนักสุด (pgvector, backfill, taste) ทำท้าย |

**Effort:** S ≈ 0.5–1 วัน · M ≈ 1–3 วัน · L ≈ 3–5 วัน (dev คนเดียว, ประมาณคร่าว ๆ)

---

## 7. Checklist ปิดงาน (ทุกฟีเจอร์)

- [ ] Gemini ถูกเรียกจาก server เท่านั้น — ไม่มี key รั่วไป client bundle
- [ ] ทุก route เช็ค `session` + `membership` ตาม pattern เดิม
- [ ] ล่ม/timeout แล้ว flow หลักไม่พัง (degrade อย่างปลอดภัย)
- [ ] ผลลัพธ์ที่โชว์ผู้ใช้เป็นภาษาไทย
- [ ] มี cache/กันเรียกซ้ำ (ไม่เผา quota)
- [ ] อ่าน `node_modules/next/dist/docs/` ยืนยัน syntax route/params ของ Next 16 แล้ว
- [ ] migration รันบน Supabase แล้ว (เก็บไฟล์ SQL ไว้ใน repo)
- [ ] อัปเดต `.env.local.example` ด้วย key ใหม่

---

## Sources (Gemini API)
- [@google/genai — npm](https://www.npmjs.com/package/@google/genai)
- [Models | Gemini API](https://ai.google.dev/gemini-api/docs/models)
- [Gemini 2.5 Flash | Gemini API](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash)
- [js-genai SDK (GitHub)](https://github.com/googleapis/js-genai)
