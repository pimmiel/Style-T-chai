# Handover — "Tag the Look" (Post Detail) + design update

> เอกสารส่งงานให้ Claude Code จากไฟล์ดีไซน์ `docs/design/Style T-chai (8 screens).html`
> ไฟล์นี้ = ดีไซน์ editorial ชุดเดิม **แต่เพิ่มหน้าใหม่ 1 หน้า** คือ **08 · Tag the Look (Post Detail)**

---

## 0. สรุปว่าอะไรใหม่ / อะไรเหมือนเดิม

ไฟล์นี้มี 8 หน้า เทียบกับชุด editorial เดิม (7 หน้า) — ผม diff แล้ว:

- **หน้า 01–07 เหมือนเดิมทุกอย่าง** (ต่างแค่รูป placeholder) → **ใช้ `docs/DESIGN_HANDOVER_EDITORIAL.md` เป็นสเปคเดิมได้เลย** ทั้ง design tokens, ฟอนต์, primitives, และ breakdown ราย 7 หน้า ไม่ต้องทำซ้ำ
- **หน้า 08 · Tag the Look = ของใหม่** → เอกสารนี้เจาะสเปคหน้านี้โดยเฉพาะ

**สำคัญ:** หน้า 08 **ไม่ใช่แค่งาน styling** — มันเป็น *ฟีเจอร์ใหม่* ที่ต้องมี data model + API + UI แบบ interactive (ปักหมุดไอเทมบนรูป outfit พร้อมข้อมูลแบรนด์/ราคา/ลิงก์ซื้อ = shoppable look). Design tokens/ฟอนต์/nav ยังยึดตาม editorial doc เดิม

---

## 1. Tag the Look คืออะไร

หน้า **รายละเอียดโพสต์ outfit** ที่ให้ปัก "หมุด" (pin) ลงบนจุดต่าง ๆ ของรูป แต่ละหมุด = 1 ไอเทมในลุค พร้อมข้อมูล ชื่อ / แบรนด์ / ร้าน / ราคา / ลิงก์ซื้อ / สี — เหมือน "credits" ของนิตยสารแฟชั่น + shoppable tags

**2 โหมด** (สลับด้วย segmented control มุมขวาบน):
- **ดูหมุด (view):** คนทั่วไปเห็น — แตะหมุดบนรูป หรือแตะรายการในลิสต์ → ไฮไลต์คู่กัน
- **ปักหมุด (edit):** เฉพาะ**เจ้าของโพสต์** — แตะบนรูปเพื่อวางหมุดใหม่ → ฟอร์มกรอกข้อมูล → บันทึก; ลบหมุดได้

---

## 2. Layout (จาก mockup)

`ScreenCard` เดิม + nav เดิม (ปุ่มขวาเปลี่ยนเป็น segmented control ดูหมุด/ปักหมุด `bg-surface-3 rounded-full p-1`)

Grid 2 คอลัมน์ **`1fr 460px`**:

**ซ้าย = The Credits (index):**
- Eyebrow "The Credits" + h2 serif "ทุกชิ้น*ในลุคนี้*" + subtext "…· N ชิ้น" (สี accent)
- (โหมด edit) แถบ hint dashed `bg-[#F4EBDA] border-dashed border-[#C9B392]`: "✛ แตะบนรูปเพื่อปักหมุดไอเทมใหม่"
- รายการไอเทม (`border-top: 1px solid var(--line)` คั่นแต่ละแถว), grid `40px 1fr auto`:
  - เลขลำดับ serif 26px (สีเปลี่ยนเมื่อ selected = accent)
  - กลาง: swatch สี 12px + ชื่อชิ้น · Eyebrow เล็ก "BRAND — SHOP" · ลิงก์ `link ↗` (สี accent)
  - ขวา: ราคา serif + (โหมด edit) ปุ่ม "นำออก" (สีแดงอ่อน `#C08A8A`)
  - แถวที่ถูกเลือกมีพื้นไฮไลต์อ่อน
- footer: อวาตาร์เจ้าของ gradient + ชื่อ + "แชร์ลุคนี้ · <caption>" + ปุ่ม `pill-outline` "♡ บันทึกลุค"

**ขวา = Photo (460px):**
- รูป outfit เต็ม `object-fit:cover; min-height:600px`, `cursor` เป็น crosshair เมื่ออยู่โหมด edit
- **หมุด** วางแบบ absolute ที่ `left:x% top:y%` — วงกลม 30px `bg` = สีไอเทม, เลขกำกับ, ขอบขาว 2px, เงา; หมุดที่เลือกขยาย `transform:scale`
- (โหมด edit, กำลังวาง) หมุด draft สี accent + ring เรือง `box-shadow:0 0 0 6px rgba(154,114,64,.25)`
- (โหมด edit, กรอกฟอร์ม) การ์ดฟอร์มลอยล่างรูป `bg-surface border-accent rounded-[16px]`:
  - หัว "ปักหมุดไอเทมใหม่" + ✕ ยกเลิก
  - inputs: ชื่อชิ้น / (แบรนด์ + ราคา) / (ร้าน + ลิงก์) — style `bg-[#FCFAF5] border-line rounded-[10px]`
  - แถวเลือกสี: swatch 26px หลายตัว (เลือกได้ ติด ring) + ปุ่ม `pill-dark` "บันทึก"

> พฤติกรรม interactive อ้างอิงได้จาก JS ใน mockup (`DCLogic`): `photoClick` แปลงพิกัดคลิกเป็น % (`(clientX-rect.left)/width*100`), `selectPin`, `saveDraft`, `deletePin`, `setColor`

---

## 3. Data model (migration)

```sql
create table if not exists post_item_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  x numeric(5,2) not null,          -- ตำแหน่ง % แนวนอน (0-100)
  y numeric(5,2) not null,          -- ตำแหน่ง % แนวตั้ง (0-100)
  name text not null,
  brand text,
  shop text,
  price text,                       -- เก็บเป็น string เช่น "฿2,590" (ตาม mockup) หรือจะทำ numeric ก็ได้
  link text,
  color text,                       -- hex ของ swatch
  position int default 0,           -- ลำดับเลขหมุด
  created_at timestamptz default now()
);

create index if not exists post_item_tags_post_idx on post_item_tags(post_id);
```

> เก็บพิกัดเป็น **%** (ไม่ใช่ px) เพื่อให้หมุดตรงจุดทุกขนาดจอ

---

## 4. API routes

### 4.1 GET โพสต์ + หมุด — `src/app/api/posts/[id]/route.ts` (เพิ่ม `GET`)
ปัจจุบันไฟล์นี้มีแค่ `PATCH` + `DELETE` — เพิ่ม `GET`:
- โหลด `posts` row (join `users(name, image)`) + `post_item_tags` (order by `position`)
- return `{ post, tags, isOwner }` โดย `isOwner = post.user_id === session?.user?.id`
- โพสต์สาธารณะดูได้ไม่ต้อง login; แต่ `isOwner` ต้องเช็ค session

### 4.2 จัดการหมุด — route ใหม่ `src/app/api/posts/[id]/tags/route.ts`
ทำตาม pattern ownership เดิมของ `PATCH` (เช็ค `posts.user_id === session.user.id` ก่อนแก้):

```ts
// POST = เพิ่มหมุด (owner only)
//  body: { x, y, name, brand?, shop?, price?, link?, color?, position? }
//  → insert post_item_tags → return { tag }
// DELETE = ลบหมุด (owner only)
//  body: { tag_id } → delete where id=tag_id and post_id=id → { ok:true }
// (option) PATCH = แก้หมุด/ลำดับ
```

ต้องเช็ค: session, โหลด `posts.user_id`, ถ้าไม่ใช่เจ้าของ → `403` (เหมือน `posts/[id]` PATCH เดิม)

---

## 5. หน้า + component

### 5.1 Route ใหม่ — `src/app/post/[id]/page.tsx`
> ระวัง: `src/app/post/page.tsx` เดิมคือหน้า **สร้างโพสต์** — อย่าทับ. หน้าใหม่คือ `post/[id]/page.tsx` (รายละเอียดโพสต์). Next 16: `params` เป็น `Promise`

- server component โหลดข้อมูลผ่าน GET (§4.1) หรือ client component ที่ fetch เอง
- ส่ง `post`, `tags`, `isOwner` ให้ `<TagTheLook />`

### 5.2 Component ใหม่ — `src/components/TagTheLook.tsx` (client)
state:
- `mode: 'view' | 'edit'` (edit เปิดได้เฉพาะ `isOwner`)
- `selectedId` (ไฮไลต์คู่ระหว่างลิสต์กับหมุด)
- `draft: { x, y, name, brand, shop, price, link, color } | null`
- `tags` (optimistic update หลัง POST/DELETE)

logic (พอร์ตจาก mockup):
- คลิกรูปในโหมด edit → คำนวณ x/y% จาก `getBoundingClientRect()` → set draft → โชว์ฟอร์ม
- save → POST `/api/posts/[id]/tags` → push เข้า tags
- ลบ → DELETE → กรองออกจาก tags
- reuse ได้: `HexColorPicker`/`hexToName` จาก `colorTheory.ts` (มีในโปรเจกต์) สำหรับเลือกสี แทน swatch เซ็ตตายตัว หรือจะทำ swatch preset ตาม mockup

### 5.3 ทางเข้าหน้านี้
- การ์ด outfit ใน Explore/Community/Profile → คลิกแล้วลิงก์ไป `/post/<id>`
- (option) badge บอกจำนวนหมุดบนการ์ด outfit ที่มี tags

---

## 6. Checklist ปิดงาน

- [ ] ใช้ design tokens/ฟอนต์/nav/`ScreenCard` จาก `DESIGN_HANDOVER_EDITORIAL.md` (อย่านิยาม token ใหม่)
- [ ] migration `post_item_tags` รันบน Supabase แล้ว + เก็บไฟล์ SQL ใน repo
- [ ] GET `/api/posts/[id]` คืน `post + tags + isOwner`
- [ ] POST/DELETE `/api/posts/[id]/tags` เช็ค ownership แบบเดียวกับ PATCH เดิม (ไม่ใช่เจ้าของ = 403)
- [ ] พิกัดหมุดเก็บ/แสดงเป็น **%** — ตรงจุดทุกขนาดจอ
- [ ] โหมด edit เปิดเฉพาะเจ้าของ (`isOwner`)
- [ ] view: แตะลิสต์↔หมุด ไฮไลต์คู่กัน
- [ ] `/post/[id]/page.tsx` ไม่ทับ `/post/page.tsx` (หน้าสร้างโพสต์เดิม)
- [ ] การ์ด outfit ลิงก์เข้าหน้านี้ได้
- [ ] responsive: จอเล็กให้รูปอยู่บน ลิสต์อยู่ล่าง (ดีไซน์วางที่ 1120px)
- [ ] อ่าน `node_modules/next/dist/docs/` ยืนยัน syntax Next 16 ก่อนเพิ่ม route/params

---

## หมายเหตุ
- ลำดับแนะนำ: ทำ design restyle (ตาม editorial doc) ให้เสร็จก่อน แล้วค่อยเสริมฟีเจอร์ Tag the Look บนหน้า post detail
- รูปใน mockup เป็น placeholder — ใช้ `posts.image_url` จริง + `next/image`
- เปิด `docs/design/Style T-chai (8 screens).html` ในเบราว์เซอร์เพื่อดู interaction จริงของหน้า 08 (สลับโหมด/ปักหมุด/ฟอร์ม) เป็นตัวเทียบ
