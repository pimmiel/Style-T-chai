export const MOCK_OUTFITS = [
  {
    id: "1",
    post_type: "outfit" as const,
    user_id: "u1",
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop",
    caption: "Navy + White minimal look สำหรับ casual Friday",
    style_tag: "Casual",
    occasion_tag: "Work",
    gender_tag: "ทุกเพศ",
    created_at: "2026-06-01T10:00:00Z",
    author: { name: "Pim K.", avatar: "PK" },
    colors: [
      { hex: "#1e3a5f", role: "เสื้อ" },
      { hex: "#ffffff", role: "กางเกง" },
      { hex: "#94a3b8", role: "รองเท้า" },
    ],
    likes: 42,
    saves: 18,
  },
  {
    id: "2",
    post_type: "outfit" as const,
    user_id: "u2",
    image_url: "https://images.unsplash.com/photo-1529139574466-a303027614b3?w=400&h=500&fit=crop",
    caption: "Earth tone ง่ายๆ ใส่สบาย แมทช์กันทุกอย่าง",
    style_tag: "Casual",
    occasion_tag: "Daily",
    gender_tag: "ผู้หญิง",
    created_at: "2026-06-02T09:00:00Z",
    author: { name: "Mint S.", avatar: "MS" },
    colors: [
      { hex: "#c4a882", role: "เสื้อ" },
      { hex: "#8b7355", role: "กางเกง" },
      { hex: "#f5f0e8", role: "รองเท้า" },
    ],
    likes: 87,
    saves: 34,
  },
  {
    id: "3",
    post_type: "outfit" as const,
    user_id: "u3",
    image_url: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=500&fit=crop",
    caption: "Black on black — monochromatic ที่ดูเท่ที่สุด",
    style_tag: "Smart Casual",
    occasion_tag: "Night Out",
    gender_tag: "ผู้ชาย",
    created_at: "2026-06-03T11:00:00Z",
    author: { name: "Art B.", avatar: "AB" },
    colors: [
      { hex: "#1a1a1a", role: "เสื้อ" },
      { hex: "#2d2d2d", role: "กางเกง" },
      { hex: "#404040", role: "รองเท้า" },
    ],
    likes: 115,
    saves: 56,
  },
  {
    id: "4",
    post_type: "outfit" as const,
    user_id: "u4",
    image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop",
    caption: "Pastel spring วันหยุดชิลๆ ☀️",
    style_tag: "Casual",
    occasion_tag: "Weekend",
    gender_tag: "ผู้หญิง",
    created_at: "2026-06-04T14:00:00Z",
    author: { name: "Fah N.", avatar: "FN" },
    colors: [
      { hex: "#fce4ec", role: "เสื้อ" },
      { hex: "#e8f5e9", role: "กางเกง" },
      { hex: "#fff9c4", role: "รองเท้า" },
    ],
    likes: 63,
    saves: 29,
  },
  {
    id: "5",
    post_type: "outfit" as const,
    user_id: "u5",
    image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop",
    caption: "Streetwear สีสด complementary look",
    style_tag: "Streetwear",
    occasion_tag: "Daily",
    gender_tag: "ทุกเพศ",
    created_at: "2026-06-05T16:00:00Z",
    author: { name: "Krit T.", avatar: "KT" },
    colors: [
      { hex: "#ff5722", role: "เสื้อ" },
      { hex: "#1565c0", role: "กางเกง" },
      { hex: "#ffffff", role: "รองเท้า" },
    ],
    likes: 98,
    saves: 41,
  },
  {
    id: "6",
    post_type: "outfit" as const,
    user_id: "u6",
    image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop",
    caption: "Formal smart — analogous blue-green",
    style_tag: "Formal",
    occasion_tag: "Work",
    gender_tag: "ผู้ชาย",
    created_at: "2026-06-06T08:00:00Z",
    author: { name: "Wan P.", avatar: "WP" },
    colors: [
      { hex: "#1b5e20", role: "เสื้อ" },
      { hex: "#0d47a1", role: "กางเกง" },
      { hex: "#37474f", role: "รองเท้า" },
    ],
    likes: 54,
    saves: 22,
  },
];

export const MOCK_TIPS = [
  {
    id: "t1",
    post_type: "tip" as const,
    user_id: "u7",
    title: "กฎ 60-30-10 สูตรง่ายๆ แต่งตัวไม่พลาด",
    body: "เลือกสีหลัก 60% (เช่น กางเกง+เสื้อตัวนอก), สีรอง 30% (เสื้อใน/เสื้อตัวเดียว), แล้วใช้สี accent อีก 10% (shoes, bag หรือ accessory) ลองดูแล้วจะพบว่า outfit ดูสมดุลขึ้นมากทันที ไม่ว่าจะใส่สีอะไรก็ตาม",
    full_body: `กฎ 60-30-10 เป็นหลักการออกแบบที่นักตกแต่งภายในใช้มานาน แต่นำมาปรับใช้กับการแต่งตัวได้ดีมาก

**หลักการ**

แบ่งสีใน outfit ออกเป็น 3 ส่วน:

- **60% — สีหลัก (Dominant)** คือสีที่ครอบพื้นที่มากที่สุด เช่น กางเกง สกินนี่ หรือเสื้อตัวนอก ควรเป็นสีที่คุณรู้สึก comfortable ที่สุด มักเป็นสี neutral เช่น navy, camel, dark grey
- **30% — สีรอง (Secondary)** เช่น เสื้อใน เสื้อตัวเดียว หรือ jacket ควรเสริมสีหลัก อาจเป็นสีที่เข้มหรืออ่อนกว่า หรือสีที่ harmonize กัน
- **10% — สี accent (Pop color)** คือส่วนเล็กที่ทำให้ look มีชีวิต เช่น รองเท้า กระเป๋า นาฬิกา หรือ scarf สีนี้สามารถ bold ได้มากกว่าส่วนอื่น

**ตัวอย่างจริง**

Look 1 (Earth tone): กางเกง camel (60%) + เสื้อขาวครีม (30%) + รองเท้า cognac brown (10%)

Look 2 (Classic): trousers navy (60%) + เสื้อขาว (30%) + loafer สีแดงเบอร์กันดี (10%)

Look 3 (Monochrome): เสื้อ-กางเกงเทา 2 เฉด (90%) + sneaker สีส้ม (10%)

**ทำไมกฎนี้ถึงได้ผล**

ตาของมนุษย์ชอบความสมดุลที่มี focal point ชัดเจน กฎ 60-30-10 สร้าง visual hierarchy ที่ดี ไม่ให้สีทะเลาะกัน แต่ก็ไม่น่าเบื่อ

**ข้อควรระวัง**

อย่าตีความแข็งทื่อเกินไป ลาย print และ texture นับเป็น "สี" ได้ด้วย เช่น เสื้อลายขาว-ดำก็คือมีทั้งสองสีในชิ้นเดียว`,
    tags: ["Color Theory", "เริ่มต้น", "กฎพื้นฐาน"],
    created_at: "2026-06-04T08:00:00Z",
    author: { name: "Nong J.", avatar: "NJ" },
    likes: 234,
    saves: 89,
  },
  {
    id: "t2",
    post_type: "tip" as const,
    user_id: "u8",
    title: "สี neutral คืออะไร และทำไมต้องมีในตู้เสื้อผ้า",
    body: "สี neutral ได้แก่ ขาว ดำ เทา ครีม น้ำตาลอ่อน และ navy — เหล่านี้คือ \"base\" ที่จับคู่ได้กับทุกสี ถ้าคุณมีเสื้อผ้า neutral อย่างน้อย 70% ของตู้ เหลืออีก 30% จะเป็น pop color อะไรก็ได้โดยไม่ต้องคิดมาก",
    full_body: `สี neutral คือกลุ่มสีที่ไม่มีค่า hue ชัดเจน หรือมีน้อยมาก จนสามารถ "วางตัวเป็นกลาง" ระหว่างสีอื่นๆ ได้

**สี neutral หลักในแฟชั่น**

- **White & Off-white** — ขาว ครีม ivory เพิ่มความสว่าง สะอาด ดูใหญ่
- **Black** — ดำ ดูสุภาพ ผอม เป็น base ที่ strong ที่สุด
- **Grey** — เทาอ่อนถึงเทาเข้ม versatile มาก ทั้ง casual และ formal
- **Navy** — น้ำเงินเข้ม ถือเป็น neutral ที่ให้ความรู้สึก classic กว่า black เล็กน้อย
- **Camel & Beige** — น้ำตาลอ่อน อุ่น earth tone ดูหรู pair ได้กับทุกสี
- **Brown tones** — น้ำตาลหลายเฉด ตั้งแต่ tan ถึง chocolate

**ทำไมต้องมี neutral ในตู้**

เสื้อผ้า neutral ทำหน้าที่เป็น "เพื่อนร่วมทาง" ที่ดีที่สุดสำหรับทุกชิ้นในตู้ เมื่อคุณลงทุนกับ statement piece สีสด เช่น เสื้อเหลืองมัสตาร์ดหรือกระเป๋าแดง neutral คือตัวที่ทำให้ชิ้นนั้นดูดีขึ้น

**สูตร 70/30**

ผู้เชี่ยวชาญด้าน wardrobe curation แนะนำให้มี neutral 70% และ color หรือ pattern 30% ของทั้งตู้ สัดส่วนนี้ทำให้แต่ละวันหยิบอะไรออกมาก็แมทช์กันได้

**Warm vs Cool Neutral**

สังเกตว่าตัวเองมี undertone ผิวแบบไหน:
- **Warm undertone** (เหลือง-ส้ม) → ชอบ camel, ivory, brown, warm grey
- **Cool undertone** (ชมพู-น้ำเงิน) → ชอบ white, black, navy, cool grey

การเลือก neutral ให้ตรง undertone ทำให้ผิวดูสว่างขึ้นมากโดยไม่ต้องพึ่ง color`,
    tags: ["Neutral Colors", "Wardrobe Basics", "เคล็ดลับ"],
    created_at: "2026-06-05T10:00:00Z",
    author: { name: "Ploy W.", avatar: "PW" },
    likes: 178,
    saves: 67,
  },
  {
    id: "t3",
    post_type: "tip" as const,
    user_id: "u9",
    title: "แต่งตัวสำหรับ body type rectangle — ทำให้ดูมีเส้นสัด",
    body: "สำหรับคนที่ไหล่ เอว สะโพกกว้างพอๆ กัน เน้นสร้าง illusion เอวด้วย belt หรือ tucked-in shirt, เลือกกางเกงที่มีทรง straight หรือ wide leg เพื่อเพิ่ม volume ที่สะโพก และหลีกเลี่ยงเสื้อที่รัดเกินไปที่จะทำให้ดูแบนราบ",
    full_body: `Body type rectangle (หรือที่บางคนเรียก "straight" หรือ "banana") คือรูปร่างที่ไหล่ เอว และสะโพกมีความกว้างใกล้เคียงกัน ซึ่งเป็น body type ที่พบมากที่สุดในทั้งสองเพศ

**ลักษณะของ rectangle body**

- ไหล่กว้างพอๆ กับสะโพก
- เอวไม่คอดชัดเจน
- โดยรวม silhouette ดูตรงเป็นเส้น

**เป้าหมายในการแต่งตัว**

สร้าง curves และ waist definition ที่ไม่มีตามธรรมชาติ หรือเพิ่ม volume ในจุดที่ต้องการ

**เทคนิคที่ได้ผล**

**สร้างเอว:**
- Tuck เสื้อเข้ากางเกง (full tuck หรือ French tuck)
- ใส่ belt ที่ตัดกับสีเสื้อ-กางเกง
- เลือกเสื้อที่มี seam หรือ dart ที่เอว
- Wrap dress และ wrap top ทำเอวได้ดีมาก

**เพิ่ม curves:**
- Wide-leg trousers หรือ palazzo pants เพิ่ม volume ที่สะโพก
- กระโปรง A-line หรือ fit-and-flare ทำให้มี curve ด้านล่าง
- Off-shoulder top เพิ่ม visual width ที่ไหล่ทำให้เอวดูเล็กเปรียบเทียบ

**สิ่งที่ควรหลีกเลี่ยง:**
- เสื้อ boxy ที่ไม่มี shape เลย จะยิ่งทำให้ดูตรง
- กางเกงทรง straight leg ล้วนๆ โดยไม่มี waist definition

**rectangle body ของผู้ชาย**

เพิ่ม texture ด้วย layering เช่น jacket ทับเสื้อ เพื่อสร้าง depth และ dimension ใส่กางเกงที่ tapered เพื่อทำให้ขาดูมีทรง`,
    tags: ["Body Type", "Styling Tips", "รูปร่าง"],
    created_at: "2026-06-06T12:00:00Z",
    author: { name: "Lek C.", avatar: "LC" },
    likes: 142,
    saves: 53,
  },
  {
    id: "t4",
    post_type: "tip" as const,
    user_id: "u10",
    title: "5 เสื้อผ้าที่ต้องมีก่อนอายุ 25",
    body: "1) White button-down shirt 2) Dark wash straight jeans 3) Black trousers 4) เดรสสีเดียว (slip dress หรือ shirt dress) 5) Blazer สีกลาง — ห้า pieces นี้สามารถ mix กันได้หลายสิบ look และพาไปได้ทุก occasion ตั้งแต่ casual ถึง smart casual",
    full_body: `5 ชิ้นนี้ไม่ใช่แค่ "ควรมี" แต่เป็น foundation ที่เมื่อมีแล้วจะทำให้การแต่งตัวทุกวันง่ายขึ้นอย่างเห็นได้ชัด

**1. White Button-down Shirt**

เสื้อเชิ้ตขาวคือชิ้นที่ versatile ที่สุดในโลก แต่งตัว:
- Tuck เข้า trousers + loafer = smart casual สำหรับออฟฟิศ
- Oversized + jeans + sneaker = casual ชิล
- Under blazer = semi-formal
- Tied at waist + skirt = feminine

เลือก: ผ้า cotton poplin หรือ oxford, ทรง relaxed fit (ไม่รัดเกินไป)

**2. Dark Wash Straight Jeans**

Jeans สีเข้มดูสุภาพกว่า light wash มาก ใส่ได้ตั้งแต่ casual ถึง smart casual
- กับ loafer/heeled boot = instantly elevated
- กับ white tee + leather jacket = classic cool
- ทำงานได้ใน office ที่ dress code ไม่ strict

เลือก: เอวปานกลาง-สูง, ขา straight หรือ slight taper

**3. Black Trousers**

Trousers ตัดเย็บดี 1 ตัว ทำงานได้หนักมาก:
- กับ silk blouse = dinner-ready
- กับ knitwear = chic casual
- กับ blazer = office perfect

เลือก: ผ้า ponte หรือ wool blend, ทรง tailored ไม่รัดเกินไป

**4. Solid Color Dress**

เดรสสีเดียวคือ complete outfit ในตัวเอง ไม่ต้องคิดว่าจะ mix กับอะไร
- Slip dress: จับทับ t-shirt, under blazer, หรือใส่คนเดียว
- Shirt dress: ทำงานได้ ใส่เล่นได้ แล้วแต่รองเท้า

เลือก: สีเข้ม (navy, black, forest green) หรือ earth tone

**5. Blazer สีกลาง**

Blazer ยกระดับ outfit ทุกชิ้น:
- ทับ t-shirt + jeans = instant polish
- กับ trousers = power suit look
- กับ dress = structured look

เลือก: navy, camel, หรือ grey. ทรงที่ shoulder fit ดี (จุดสำคัญที่สุด)`,
    tags: ["Wardrobe Essentials", "Budget Style", "Basics"],
    created_at: "2026-06-07T09:00:00Z",
    author: { name: "Tae R.", avatar: "TR" },
    likes: 312,
    saves: 145,
  },
];

export const MOCK_LOOKBOOKS = [
  {
    id: "l1",
    post_type: "lookbook" as const,
    user_id: "u11",
    title: "Monochrome Week — 7 วันกับ 7 โทนสี",
    description: "ลองใส่ monochrome ทุกวันตลอดสัปดาห์ แต่ละวันเป็นสีคนละสี ง่ายกว่าที่คิด และ comment ที่ได้รับเยอะมาก",
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=400&fit=crop",
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=300&h=400&fit=crop",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&h=400&fit=crop",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=400&fit=crop",
    ],
    style_tag: "Casual",
    gender_tag: "ทุกเพศ",
    created_at: "2026-06-03T15:00:00Z",
    author: { name: "Beam S.", avatar: "BS" },
    likes: 267,
    saves: 112,
  },
  {
    id: "l2",
    post_type: "lookbook" as const,
    user_id: "u12",
    title: "Office Week Looks — Smart Casual ทุกวัน",
    description: "5 วัน 5 look สำหรับออฟฟิศที่ไม่ formal เกินไป แต่ก็ไม่ casual เกิน เหมาะสำหรับ dress code: smart casual",
    images: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=400&fit=crop",
      "https://images.unsplash.com/photo-1529139574466-a303027614b3?w=300&h=400&fit=crop",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=400&fit=crop",
    ],
    style_tag: "Smart Casual",
    gender_tag: "ผู้หญิง",
    created_at: "2026-06-05T08:00:00Z",
    author: { name: "Nam P.", avatar: "NP" },
    likes: 189,
    saves: 78,
  },
];

export const MOCK_IDEAS = [
  MOCK_OUTFITS[0], MOCK_TIPS[0], MOCK_LOOKBOOKS[0],
  MOCK_OUTFITS[1], MOCK_TIPS[1],
  MOCK_OUTFITS[2], MOCK_LOOKBOOKS[1],
  MOCK_OUTFITS[3], MOCK_TIPS[2],
  MOCK_OUTFITS[4], MOCK_TIPS[3],
  MOCK_OUTFITS[5],
];

export const MOCK_FOLLOWING_IDEAS = [
  MOCK_OUTFITS[1],   // Earth tone (Mint S.)
  MOCK_TIPS[0],      // กฎ 60-30-10 (Nong J.)
  MOCK_LOOKBOOKS[1], // Office Week (Nam P.)
  MOCK_OUTFITS[4],   // Streetwear (Krit T.)
];

export const STYLE_TAGS = [
  "ทุกสไตล์", "Casual", "Smart Casual", "Formal", "Streetwear",
  "Minimalist", "Bohemian", "Vintage", "Preppy", "Athleisure",
  "Business Casual", "Chic", "Y2K", "Cottagecore", "Edgy",
];

export const OCCASION_TAGS = [
  "Daily", "Work", "Weekend", "Night Out", "Special Event", "Sport",
  "Travel", "Beach", "Date Night", "Party", "Festival", "Wedding",
  "Gym", "Outdoor", "Brunch",
];

export const GENDER_TAGS = ["ทุกเพศ", "ผู้หญิง", "ผู้ชาย"];
export const TIP_TAGS = ["Color Theory", "Wardrobe Basics", "Body Type", "Budget Style", "Styling Tips", "เริ่มต้น", "Season", "Accessory"];
export const CONTENT_TYPES = ["ทั้งหมด", "Outfit", "Tips", "Lookbook"] as const;
