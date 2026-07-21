# Design Handover — "Style T-chai Editorial" restyle

> เอกสารส่งงานให้ Claude Code นำดีไซน์ **Style T-chai Editorial** (สไตล์นิตยสารแฟชั่น โทนอุ่นเบจ/แคเมล เซริฟหรู เลย์เอาต์อสมมาตร) ไป implement บนแอปที่มีอยู่
> **นี่คือการ restyle ของเดิม** ไม่ใช่สร้างใหม่ — ทุกหน้าในดีไซน์ map ตรงกับ route ที่มีอยู่แล้ว
> ไฟล์ดีไซน์ต้นฉบับ (source of truth ด้านภาพ): `docs/design/Style T-chai Editorial.html` — เปิดในเบราว์เซอร์เพื่อดูของจริง

---

## 0. บริบท + ขอบเขต

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind **v4** · shadcn/ui · Supabase · NextAuth · Stripe

**⚠️ อ่านก่อนเขียนโค้ด:**
- `AGENTS.md`: Next.js 16 มี breaking changes — เช็ค `node_modules/next/dist/docs/` ก่อนแตะ routing/layout
- Tailwind **v4** ใช้ `@theme` ใน CSS (ไม่มี `tailwind.config.js` แบบเดิม) — token ทั้งหมดประกาศใน `src/app/globals.css`

**สิ่งที่ต้องทำ:** เปลี่ยน "หน้าตา" (สี, ฟอนต์, spacing, layout, component styling) ให้เป็น editorial ตามดีไซน์ **โดยไม่แตะ logic/data/route/API** ที่ทำงานอยู่แล้ว

**สิ่งที่ห้ามทำ:** อย่าเปลี่ยนโครง data, API contract, ชื่อ route, auth flow, Stripe — แค่ห่อ/ปรับ presentation layer

**ดีไซน์มี 7 หน้า — map กับของจริงดังนี้:**

| # | หน้าในดีไซน์ | ไฟล์/route ที่มีอยู่ |
|---|---|---|
| 01 | Landing | `src/app/page.tsx` |
| 02 | Explore | `src/app/feed/page.tsx` (`?visibility=explore`) |
| 03 | Community Feed | `src/app/feed/page.tsx` (`?visibility=community`) |
| 04 | Color Matcher | `src/app/tool/page.tsx` + `src/components/ColorMatcher.tsx` |
| 05 | Profile | `src/app/profile/page.tsx` |
| 06 | Subscription | `src/app/subscription/page.tsx` (Duo/Squad/Crew ฿59/99/149 = ตรงกับ `src/lib/plans.ts` เป๊ะ) |
| 07 | Groups | `src/app/groups/page.tsx` + `src/app/groups/[id]/page.tsx` |

Component ที่จะโดนปรับสไตล์: `Navbar`, `OutfitCard`, `TipCard`, `LookbookCard`, `ColorMatcher`, `EditOutfitModal`, `ShareToGroupModal`, และ shadcn/ui primitives (`button`, `card`, `badge`, `tabs`, `input`, `select`, `label`)

---

## 1. Design tokens (ทำก่อนอย่างอื่น)

### 1.1 Palette

| Token | Hex | ใช้ตรงไหน |
|---|---|---|
| `--paper` | `#EDE6DA` | พื้นหลังหน้า (warm beige) |
| `--surface` | `#FAF6EF` | พื้นการ์ด/panel (cream) |
| `--surface-2` | `#F6F0E6` | panel ย่อย/inset |
| `--surface-3` | `#F0E7D7` | chip/ไอคอนพื้นอ่อน |
| `--ink` | `#2A2620` | ตัวอักษรหลัก + บล็อกเข้ม |
| `--ink-soft` | `#4A443B` | text บนพื้นเข้มอ่อน |
| `--muted` | `#6B6156` | body รอง |
| `--muted-2` | `#8A8175` | meta/caption |
| `--accent` | `#9A7240` | **หลัก** — eyebrow, คำ italic เน้น, link |
| `--accent-hover` | `#6F5228` | link hover |
| `--gold` | `#C9A66B` | CTA บนพื้นเข้ม, badge "ยอดนิยม" |
| `--line` | `#E4D9C9` | เส้นขอบหลัก |
| `--line-2` | `#EAE0D0` | เส้นแบ่ง section |

### 1.2 Typography
- **Display/heading:** `Newsreader` (serif) — weight 400 เป็นหลัก, ใช้ **italic** สำหรับคำเน้น (สี `--accent`)
- **Body/UI (ไทย+อังกฤษ):** `Anuphan` — 300/400/500
- **Mono:** hex code ใช้ monospace (`ui-monospace`)
- **Eyebrow label** (ลาย signature ของดีไซน์นี้): `Newsreader`, 12–13px, `letter-spacing: 3px`, `text-transform: uppercase`, `color: var(--accent)`

### 1.3 Shape & elevation
- Radius: การ์ดจอ `20px` · การ์ดย่อย `16–18px` · chip เล็ก `12–14px` · pill `999px`
- เงาการ์ดจอ: `0 30px 60px -30px rgba(60,45,25,.35)`
- เงา CTA/popular: `0 24px 48px -20px rgba(42,38,32,.6)`
- ขอบการ์ด: `1px solid var(--line)`

### 1.4 ประกาศ tokens ใน `src/app/globals.css` (Tailwind v4)

> **สำคัญ — เช็คของเดิมก่อน:** `globals.css` ปัจจุบันใช้ pattern `@theme inline { ... }` ผูกกับ CSS variables (เช่น `--color-background: var(--background)`) และมี `@import "shadcn/tailwind.css"` + `tw-animate-css` อยู่แล้ว **และ Anuphan ถูกตั้งเป็น `--font-sans`/`--font-heading` เรียบร้อยแล้ว** ผ่าน `--font-anuphan`
> → อย่าลบของเดิม ให้ **เพิ่ม** editorial tokens ต่อยอดตาม pattern เดิม (กำหนดค่า hex ใน `:root` แล้วชี้ผ่าน `@theme inline`) และงานฟอนต์เหลือแค่ "เพิ่ม Newsreader" อย่างเดียว
> ตัวอย่างด้านล่างเป็น shorthand — ปรับให้เข้ากับโครง `@theme inline` ที่มีอยู่

```css
@import "tailwindcss";

@theme {
  --color-paper: #EDE6DA;
  --color-surface: #FAF6EF;
  --color-surface-2: #F6F0E6;
  --color-surface-3: #F0E7D7;
  --color-ink: #2A2620;
  --color-ink-soft: #4A443B;
  --color-muted: #6B6156;
  --color-muted-2: #8A8175;
  --color-accent: #9A7240;
  --color-accent-hover: #6F5228;
  --color-gold: #C9A66B;
  --color-line: #E4D9C9;
  --color-line-2: #EAE0D0;

  --font-serif: "Newsreader", Georgia, serif;
  --font-sans: "Anuphan", -apple-system, BlinkMacSystemFont, sans-serif;

  --radius-card: 20px;
  --shadow-screen: 0 30px 60px -30px rgba(60,45,25,.35);
}

body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
a { color: var(--color-accent); text-decoration: none; }
a:hover { color: var(--color-accent-hover); }
```

> เมื่อประกาศใน `@theme` แล้ว จะได้ utility อัตโนมัติ เช่น `bg-surface`, `text-accent`, `border-line`, `font-serif` — ใช้แทนสี Tailwind default ทั้งหมด

### 1.5 โหลดฟอนต์ด้วย `next/font` ใน `src/app/layout.tsx`

> Anuphan โหลดอยู่แล้วใน `layout.tsx` (var `--font-anuphan`) — **เพิ่มแค่ Newsreader** (ต้องมี `style: ["normal","italic"]` เพราะดีไซน์ใช้ italic เยอะ) แล้ว append `variable` เข้า `<html className>`

```ts
import { Newsreader } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"], style: ["normal", "italic"],
  weight: ["400", "500"], variable: "--font-newsreader", display: "swap",
});

// <html className={`${anuphan.variable} ${newsreader.variable}`}>  ← เพิ่ม newsreader.variable ต่อของเดิม
// แล้วใน globals.css: --font-serif: var(--font-newsreader);
```

---

## 2. Primitives ที่ต้องทำ/ปรับก่อน (ใช้ซ้ำทุกหน้า)

สร้างเป็น component เล็ก ๆ ใน `src/components/ui/` (เสริม shadcn) เพื่อไม่ต้อง copy inline style:

1. **`Eyebrow`** — ป้ายหัวข้อ serif ตัวเล็ก letter-spacing กว้าง สี accent (ใช้ทุกหน้า)
   ```tsx
   export function Eyebrow({ children }: { children: React.ReactNode }) {
     return <div className="font-serif text-[13px] tracking-[3px] uppercase text-accent">{children}</div>;
   }
   ```
2. **`DisplayHeading`** — h1/h2 serif น้ำหนัก 400 + รองรับ `<em>` italic สี accent สำหรับคำเน้น
3. **Button variants** (ปรับ `src/components/ui/button.tsx` — เพิ่ม variant ผ่าน `class-variance-authority` ที่มีอยู่):
   - `pill-dark`: `bg-ink text-surface rounded-full` (ปุ่มหลัก)
   - `pill-outline`: `border border-[#C9BBA6] text-ink rounded-full`
   - `pill-gold`: `bg-gold text-ink font-semibold rounded-full` (CTA บนพื้นเข้ม)
4. **`ScreenCard`** — กล่องหน้าจอหลัก: `bg-surface rounded-[20px] border border-line shadow-screen overflow-hidden`
5. **`FilterChip`** — chip กรอง: active = `bg-ink text-surface`, idle = `border border-line-2 text-muted`, ทั้งคู่ `rounded-full text-[13px] px-4 py-2`
6. **`ColorSwatch`** — วงกลม/เหลี่ยมสี มีขอบ `border-2 border-white` + `shadow-[0_0_0_1px_var(--color-line)]` (ใช้ใน card, palette, theme planner)

### Navbar (`src/components/Navbar.tsx`) — ปรับให้ตรงทุกหน้า
- โลโก้: `Style` (serif) + `T-chai` (serif **italic** สี accent) baseline-aligned
- ลิงก์กลาง: Explore · Community · กลุ่ม · Color Tool — หน้า active ได้ underline `1px solid var(--accent)` + `text-ink font-medium`
- ขวา: ไอคอน ♡ / ☰ + ปุ่ม `pill-dark` "＋ แชร์ไอเดีย" (ตอน logged-in) หรือ "เข้าสู่ระบบ / สมัครฟรี" (landing)
- เส้นล่าง nav: `border-b border-line-2`, padding `22px 40px`

---

## 3. รายละเอียดต่อหน้า

> หลักการ: เอา **data/hooks เดิม** มาแสดงในโครง layout ใหม่ อย่ารื้อ fetch/logic. รูปในดีไซน์เป็น placeholder (UUID) — ใช้ `image_url` จริงจาก DB

### 01 · Landing (`src/app/page.tsx`)
- **Hero grid** 2 คอลัมน์ (`1.02fr .98fr`): ซ้าย = eyebrow + h2 serif 60px (มีคำ italic accent "มีสไตล์") + subtext + ปุ่มคู่ (`pill-dark` + `pill-outline`) + สถิติ 3 ตัว (12k+ / 3.4k / 500+ แบบตัวเลข serif); ขวา = รูป full-bleed + การ์ดลอย palette (`rgba(250,246,239,.94)` + `backdrop-blur`)
- **Value props** 3 คอลัมน์: ไอคอนกล่อง `bg-surface-3 rounded-[14px]` + หัว serif + คำอธิบาย (ค้นหาแรงบันดาลใจ / จับคู่สีอัตโนมัติ / แต่งตัวกับเพื่อน)
- **CTA strip**: บล็อกเข้ม `bg-ink rounded-[18px]` หัวขาว + ปุ่ม `pill-gold` "สมัครเลย →"

### 02 · Explore (`src/app/feed/page.tsx`, explore mode)
- Header บทความ: Eyebrow "The Journal · <เดือน ปี>" + h2 serif 44px (คำ italic accent) + subtext
- แถวฟิลเตอร์: `FilterChip` (ทั้งหมด/Outfit/Tips/Lookbook) + ป้าย serif italic "N ไอเดียล่าสุด" ชิดขวา
- **Masonry** `column-count:3; column-gap:24px`, การ์ด `break-inside:avoid`
- การ์ดมี 3 แบบ (ให้ `OutfitCard`/`TipCard`/`LookbookCard` render ตาม `post_type`):
  - **Outfit**: รูป + Eyebrow แท็กสไตล์ + caption + แถว swatches หรือ meta (♡ likes · ⌂ saves)
  - **Tip**: การ์ด **พื้นเข้ม** `bg-ink text-paper` + Eyebrow gold + หัว serif + เนื้อ + ผู้เขียน (ตัดกับการ์ดขาว เป็นจุดเด่น editorial)
  - **Lookbook**: กริดรูป 2×2 (`gap:2px`) + Eyebrow "Lookbook · N วัน" + title

### 03 · Community Feed (`src/app/feed/page.tsx`, community mode)
- โครงคล้าย Explore แต่ grid คงที่ `repeat(3,1fr)` (ไม่ masonry)
- Eyebrow "ฟีดของคุณ" + h2 "ไอเดียจากตัวคุณ *และคนที่ติดตาม*"
- ฟิลเตอร์ 2 กลุ่มคั่นด้วยเส้นตั้ง `1px` (ประเภท | สไตล์ | เพศ)
- โพสต์ของ user เอง: ป้ายมุมรูป `bg-[rgba(42,38,32,.8)] text-surface` "โพสต์ของคุณ"

### 04 · Color Matcher (`src/app/tool/page.tsx` + `ColorMatcher.tsx`)
- Header กลางหน้า: Eyebrow "The Tool" + h2 "Color *Matcher*" + subtext (ข้อความมีอยู่แล้วในโค้ด)
- Layout 2 คอลัมน์ (`1fr 1.15fr`):
  - ซ้าย = การ์ด picker `bg-white`: label "1 · เลือกสีหลักของคุณ" + กริดสี 6 คอลัมน์ (สีที่เลือกมี ring `shadow-[0_0_0_3px_var(--color-accent),0_0_0_5px_#fff]`) + แถบสรุปสี (`bg-surface-2`, ชื่อสี serif + hex)
  - ขวา = การ์ดผลลัพธ์ต่อ scheme (`bg-white`): Eyebrow ชื่อ scheme + คำอธิบายไทย + แถว swatch 64px มี hex mono ใต้ + การ์ดทิป **พื้นเข้ม** `bg-ink` มี 💡 + คำแนะนำ
- **เชื่อมกับของจริง:** `getColorSchemes()` ใน `src/lib/colorTheory.ts` ให้ palette อยู่แล้ว — แค่จับใส่ layout ใหม่ คง `HexColorPicker` (react-colorful) ไว้ได้ หรือใช้ preset grid ตามดีไซน์

### 05 · Profile (`src/app/profile/page.tsx`)
- **Header**: อวาตาร์วงกลม 104px `linear-gradient(135deg,#C9A66B,#8A6A44)` ตัวย่อ serif + ชื่อ serif 34px + อีเมล + สถิติ 3 ตัว (โพสต์/ผู้ติดตาม/กำลังติดตาม, ตัวเลข serif) + ปุ่ม `pill-outline` "แก้ไขโปรไฟล์" + ลิงก์ "ออกจากระบบ" (ใช้ `SignOutButton` เดิม)
- **Tabs** (ใช้ shadcn `tabs`): โพสต์ของฉัน / บันทึกไว้ / ถูกใจ — active underline `2px solid var(--ink)`
- **Grid** `repeat(3,1fr)` รูป outfit สี่เหลี่ยม + การ์ดสุดท้าย "＋ เพิ่มโพสต์" (`bg-surface-3` dashed)

### 06 · Subscription (`src/app/subscription/page.tsx`)
- Header กลาง: Eyebrow "Group Subscription" + h2 "แต่งตัว *theme เดียวกัน* กับเพื่อน"
- 3 การ์ดราคา (`repeat(3,1fr)`, align-items:stretch) — **ต่อกับ `PLAN_DETAILS` เดิม**:
  - **Duo ฿59** / **Squad ฿99** / **Crew ฿149** (ตรงกับ `plans.ts`)
  - Squad = การ์ดเด่น **พื้นเข้ม** `bg-ink text-paper` + badge ลอย `bg-gold` "ยอดนิยม" (`top:-13px`) + ราคาสี gold + เงา popular
  - การ์ดอื่นพื้นขาว ราคา serif 46px + list ฟีเจอร์ (✓) + ปุ่ม (`pill-outline` ปกติ / `pill-gold` สำหรับ Squad)
  - ปุ่ม "สมัครเลย" ต่อ `handleSubscribe(members)` เดิม (2/5/10)
- ท้าย: "ชำระผ่าน Stripe · ยกเลิกได้ตลอดเวลา · ราคารวม VAT"

### 07 · Groups (`src/app/groups/page.tsx` + `[id]/page.tsx`)
- Header: badge `bg-surface-3 text-[#8A6A44]` "♛ Premium" + h2 serif "กลุ่มของฉัน" + ปุ่ม `pill-dark` "＋ สร้างกลุ่ม"
- Layout 2 คอลัมน์ (`.85fr 1.15fr`):
  - **ซ้าย = list กลุ่ม**: การ์ดกลุ่ม active มีขอบ accent `border-[#9A7240]` + เงา, ไอคอนกลุ่ม gradient + ชื่อ + "n/max คน" + avatar stack (ซ้อน `margin-left:-8px`) + swatch ธีม; การ์ดอื่นเรียบ + `›`; ท้ายมี dashed "＋ สร้างกลุ่มใหม่"
  - **ขวา = รายละเอียดกลุ่ม** (`groups/[id]`): header ชื่อ serif + ปุ่ม "⧉ เชิญเพื่อน"; Tabs (แผน Theme / outfit ของกลุ่ม / สมาชิก)
    - **7-day theme planner**: แถววัน `bg-surface-2 rounded-[12px]` — กล่องวันที่ (ชื่อวัน + เลขวันที่ serif) + ชื่อธีม + occasion + swatch สี; แถวว่าง dashed "＋ เพิ่มแผนวันอื่น" → ต่อ `group_theme_plans` API เดิม
    - **outfit votes**: กริด 2 คอลัมน์ รูป + badge นับโหวตมุมขวา `♡ n` → ต่อ vote API เดิม

---

## 4. ลำดับการทำ

| ลำดับ | งาน | เหตุผล |
|---|---|---|
| 1 | §1 tokens + fonts (`globals.css`, `layout.tsx`) | ทุกหน้าพึ่ง |
| 2 | §2 primitives + `Navbar` | ใช้ซ้ำทุกหน้า, ทำครั้งเดียว |
| 3 | Landing (01) | หน้าแรกที่คนเห็น, ตั้ง tone |
| 4 | Explore + Community (02–03) | ใช้ `OutfitCard/TipCard/LookbookCard` ร่วมกัน — ปรับทีเดียวได้ 2 หน้า |
| 5 | Color Matcher (04) | เชื่อม `colorTheory.ts` เดิม |
| 6 | Profile (05) + Subscription (06) | หน้ามาตรฐาน |
| 7 | Groups (07) | ซับซ้อนสุด (2 หน้า + planner + votes) ทำท้าย |

---

## 5. Checklist ปิดงาน

- [ ] tokens อยู่ใน `@theme` ของ `globals.css` — ไม่มี hex ลอย ๆ ในคอมโพเนนต์ (ใช้ utility `bg-surface`, `text-accent` ฯลฯ)
- [ ] ฟอนต์โหลดผ่าน `next/font` (Newsreader italic + Anuphan thai subset) — ไม่ใช่ `<link>` ตรง ๆ
- [ ] Eyebrow / DisplayHeading / pill buttons / ScreenCard / FilterChip ทำเป็น component ใช้ซ้ำ ไม่ copy inline style
- [ ] **ไม่แตะ** data fetch, API route, auth, Stripe logic — เปลี่ยนแค่ presentation
- [ ] ราคาหน้า Subscription อ่านจาก `PLAN_DETAILS` (ไม่ hardcode)
- [ ] Color Matcher ยังใช้ `getColorSchemes()` จริง
- [ ] Theme planner / votes ยังยิง API `group_theme_plans` / vote เดิม
- [ ] รูปทั้งหมดใช้ `image_url` จริง (ดีไซน์เป็น placeholder) + ใช้ `next/image`
- [ ] responsive: ดีไซน์วางที่ width 1120px — เพิ่ม breakpoint ให้ grid ยุบเป็น 1 คอลัมน์บนมือถือ
- [ ] เช็ค contrast: text บนพื้นเข้ม `bg-ink` ต้องใช้ `text-paper/surface`, meta ใช้โทน `#C4BBAC`
- [ ] อ่าน `node_modules/next/dist/docs/` ยืนยัน syntax Next 16 ก่อนแก้ `layout.tsx`

---

## หมายเหตุ assets
ดีไซน์ต้นฉบับฝังรูปไว้เป็น reference (UUID) — **ห้ามพยายามดึงรูปเหล่านั้นมาใช้** ให้ใช้รูปจริงจากผู้ใช้/DB. เปิดไฟล์ `docs/design/Style T-chai Editorial.html` ในเบราว์เซอร์เพื่อดู mockup ที่ render เต็ม (สี/สัดส่วน/spacing) เป็นตัวเทียบ
