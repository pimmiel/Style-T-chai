import chroma from "chroma-js";

export interface ColorScheme {
  type: "complementary" | "analogous" | "triadic" | "monochromatic" | "split-complementary" | "tetradic";
  label: string;
  description: string;
  colors: string[];
  outfitRoles: { role: string; color: string }[];
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function hsl(h: number, s: number, l: number): string {
  return chroma.hsl((h + 360) % 360, clamp(s, 0, 1), clamp(l, 0, 1)).hex();
}

// Wearable bottom: very low saturation, light — like cream/beige tinted to the hue
function neutralBottom(h: number): string {
  return hsl(h, 0.10, 0.86);
}

// Wearable dark bottom: navy/charcoal tinted to hue — pairs with bold shirts
function darkBottom(h: number): string {
  return hsl(h, 0.18, 0.22);
}

// Tonal shoes: darker, heavily desaturated version of pants hue — reads as neutral shoe in that hue family
function shoesFor(pantsHex: string): string {
  const [ph, ps, pl] = chroma(pantsHex).hsl();
  return hsl(ph ?? 0, clamp((ps ?? 0) * 0.40, 0, 0.20), clamp((pl ?? 0.5) - 0.36, 0.12, 0.36));
}

// Muted accent: keeps hue but desaturates enough to be wearable as a medium piece
function mutedAccent(h: number, s: number, l: number): string {
  return hsl(h, s * 0.35, clamp(l + 0.12, 0, 1));
}

function normalizeH(h: number): number {
  return ((h % 360) + 360) % 360;
}

function inRange(h: number, lo: number, hi: number): boolean {
  const n = normalizeH(h);
  return lo <= hi ? n >= lo && n <= hi : n >= lo || n <= hi;
}

// Returns true for hue pairs that look culturally off in fashion
function isProblematicPair(baseH: number, accentH: number, s: number): boolean {
  const redZone   = inRange(baseH,   345, 25);
  const greenZone = inRange(baseH,   90, 155);
  const yellowZone = inRange(baseH,  45,  75);

  const accentRed    = inRange(accentH, 345, 25);
  const accentGreen  = inRange(accentH,  90, 155);
  const accentViolet = inRange(accentH, 255, 285);

  if (redZone && accentGreen)   return true; // Christmas
  if (greenZone && accentRed)   return true; // Christmas reversed
  if (yellowZone && accentViolet && s > 0.70) return true; // garish cartoon

  return false;
}

// Like hsl() but auto-desaturates if base+accent is a problematic fashion pair
function safeAccent(h: number, s: number, l: number, baseH: number): string {
  if (isProblematicPair(baseH, h, s)) {
    return hsl(h, s * 0.12, clamp(l + 0.18, 0.65, 0.82));
  }
  return hsl(h, s, l);
}

export function getColorSchemes(baseHex: string): ColorScheme[] {
  const [rawH, rawS, rawL] = chroma(baseHex).hsl();
  const base = baseHex;

  // Near-neutral colors (white, gray, black) have no meaningful hue for color theory.
  // Boost saturation so the algorithm produces a useful palette anyway.
  const H = rawH ?? 0;
  const S = (rawS ?? 0) < 0.12 ? 0.55 : (rawS ?? 0);
  const L = (rawS ?? 0) < 0.12 ? clamp(rawL ?? 0.5, 0.35, 0.65) : (rawL ?? 0.5);

  // Complementary — base tint → base → warm muted connector → complement → complement deep
  const comp: string[] = [
    hsl(H, S * 0.65, L + 0.22),
    base,
    hsl(H + 180, S * 0.22, 0.84),
    hsl(H + 180, S, L),
    hsl(H + 180, S * 1.1, L - 0.18),
  ];

  // Analogous — spread ±40° with slight S+L variation
  const ana: string[] = [
    hsl(H - 40, S * 0.85, L + 0.10),
    hsl(H - 20, S * 0.95, L + 0.05),
    base,
    hsl(H + 20, S * 0.90, L - 0.05),
    hsl(H + 40, S * 0.75, L + 0.08),
  ];

  // Triadic — base tint + base + triadic1 + triadic2 soft + triadic1 deep
  const tri: string[] = [
    hsl(H, S * 0.70, L + 0.20),
    base,
    hsl(H + 120, S, L),
    hsl(H + 240, S * 0.85, L + 0.12),
    hsl(H + 120, S * 1.1, L - 0.15),
  ];

  // Monochromatic — 5 steps varying both L and S
  const mono: string[] = [
    hsl(H, S * 0.50, L + 0.38),
    hsl(H, S * 0.78, L + 0.18),
    base,
    hsl(H, S * 1.10, L - 0.18),
    hsl(H, S * 1.20, L - 0.36),
  ];

  // Split-Complementary — base tint + base + split1 + split2 + soft true-complement accent
  const split: string[] = [
    hsl(H, S * 0.70, L + 0.18),
    base,
    hsl(H + 150, S, L),
    hsl(H + 210, S, L),
    hsl(H + 180, S * 0.40, L + 0.15),
  ];

  // Tetradic — 4 hues at 90° + muted base as connector
  const tetra: string[] = [
    base,
    hsl(H + 90, S * 0.90, L),
    hsl(H + 180, S, L),
    hsl(H + 270, S * 0.90, L),
    hsl(H, S * 0.40, L + 0.25),
  ];

  // Pre-compute pants colors so shoesFor() can derive tonal shoes from them
  const compPants  = neutralBottom(H);
  const triPants   = mutedAccent(H + 120, S, L);
  const splitPants = neutralBottom(H);
  const tetraPants = darkBottom(H);

  return [
    {
      type: "complementary",
      label: "Complementary",
      description: "สีตรงข้ามในวงล้อสี — ให้ความรู้สึกโดดเด่น มีพลัง ดึงดูดสายตา เหมาะกับ statement outfit",
      colors: comp,
      outfitRoles: [
        { role: "เสื้อ", color: comp[1] },
        { role: "กางเกง/กระโปรง", color: compPants },
        { role: "รองเท้า", color: shoesFor(compPants) },
        { role: "กระเป๋า", color: safeAccent(H + 180, S * 0.60, L, H) },
        { role: "Accessory", color: comp[0] },
      ],
    },
    {
      type: "analogous",
      label: "Analogous",
      description: "สีข้างเคียงกัน — ให้ความรู้สึก harmony นุ่มนวล เป็นธรรมชาติ เหมาะกับ everyday look",
      colors: ana,
      outfitRoles: [
        { role: "เสื้อ", color: ana[2] },
        { role: "กางเกง/กระโปรง", color: mutedAccent(H + 20, S, L) },
        { role: "รองเท้า", color: shoesFor(mutedAccent(H + 20, S, L)) },
        { role: "กระเป๋า", color: ana[1] },
        { role: "Accessory", color: ana[0] },
      ],
    },
    {
      type: "triadic",
      label: "Triadic",
      description: "3 สีห่างกัน 120° — สดใส มีชีวิตชีวา เหมาะกับ casual หรือ creative look",
      colors: tri,
      outfitRoles: [
        { role: "เสื้อ", color: tri[1] },
        { role: "กางเกง/กระโปรง", color: triPants },
        { role: "รองเท้า", color: shoesFor(triPants) },
        { role: "กระเป๋า", color: safeAccent(H + 240, S * 0.65, L, H) },
        { role: "Accessory", color: tri[0] },
      ],
    },
    {
      type: "monochromatic",
      label: "Monochromatic",
      description: "เฉดเดียวกัน เข้ม-อ่อน — elegant เรียบหรู ดูแพง เหมาะกับ minimal หรือ formal look",
      colors: mono,
      outfitRoles: [
        { role: "เสื้อ", color: mono[2] },
        { role: "กางเกง/กระโปรง", color: mono[3] },
        { role: "รองเท้า", color: mono[4] },
        { role: "กระเป๋า", color: mono[1] },
        { role: "Accessory", color: mono[0] },
      ],
    },
    {
      type: "split-complementary",
      label: "Split",
      description: "สองสีข้างๆ ของคู่ตรงข้าม — น่าสนใจกว่า complementary แต่ไม่ตีกันแรง เหมาะสำหรับมือใหม่",
      colors: split,
      outfitRoles: [
        { role: "เสื้อ", color: split[1] },
        { role: "กางเกง/กระโปรง", color: splitPants },
        { role: "รองเท้า", color: shoesFor(splitPants) },
        { role: "กระเป๋า", color: safeAccent(H + 150, S * 0.60, L, H) },
        { role: "Accessory", color: split[0] },
      ],
    },
    {
      type: "tetradic",
      label: "Tetradic",
      description: "4 สีห่างกัน 90° (2 คู่ตรงข้าม) — bold และสมดุล เหมาะกับ editorial หรือ fashion-forward look",
      colors: tetra,
      outfitRoles: [
        { role: "เสื้อ", color: tetra[0] },
        { role: "กางเกง/กระโปรง", color: tetraPants },
        { role: "รองเท้า", color: shoesFor(tetraPants) },
        { role: "กระเป๋า", color: safeAccent(H + 90, S * 0.60, L, H) },
        { role: "Accessory", color: tetra[4] },
      ],
    },
  ];
}

export function getContrastColor(hex: string): string {
  return chroma(hex).luminance() > 0.4 ? "#1a1a1a" : "#ffffff";
}

const COLOR_NAMES: [string, string][] = [
  ["Black", "#000000"], ["Charcoal", "#36454F"], ["Dark Gray", "#4A4A4A"],
  ["Gray", "#808080"], ["Silver", "#C0C0C0"], ["Light Gray", "#D3D3D3"],
  ["Off White", "#FAF9F6"], ["White", "#FFFFFF"], ["Ivory", "#FFFFF0"],
  ["Cream", "#FFFDD0"], ["Beige", "#F5F5DC"], ["Linen", "#FAF0E6"],
  ["Champagne", "#F7E7CE"], ["Tan", "#D2B48C"], ["Sand", "#C2B280"],
  ["Camel", "#C19A6B"], ["Khaki", "#C3B091"], ["Taupe", "#8B7355"],
  ["Brown", "#964B00"], ["Dark Brown", "#5C3317"], ["Chocolate", "#7B3F00"],
  ["Espresso", "#3B1F0C"], ["Rust", "#B7410E"], ["Burnt Orange", "#CC5500"],
  ["Orange", "#FF7518"], ["Tangerine", "#F28500"], ["Amber", "#FFBF00"],
  ["Gold", "#FFD700"], ["Yellow", "#FFE135"], ["Lemon", "#FFF44F"],
  ["Lime", "#32CD32"], ["Olive", "#808000"], ["Dark Green", "#006400"],
  ["Forest Green", "#228B22"], ["Green", "#4CAF50"], ["Mint", "#98FF98"],
  ["Sage", "#8FAF8F"], ["Teal", "#008080"], ["Cyan", "#00BCD4"],
  ["Sky Blue", "#87CEEB"], ["Baby Blue", "#89CFF0"], ["Cornflower", "#6495ED"],
  ["Blue", "#2196F3"], ["Cobalt", "#0047AB"], ["Navy", "#000080"],
  ["Midnight Blue", "#191970"], ["Indigo", "#4B0082"], ["Violet", "#8F00FF"],
  ["Purple", "#800080"], ["Lavender", "#E6E6FA"], ["Lilac", "#C8A2C8"],
  ["Mauve", "#E0B0FF"], ["Plum", "#DDA0DD"], ["Magenta", "#FF00FF"],
  ["Fuchsia", "#FF77FF"], ["Hot Pink", "#FF69B4"], ["Pink", "#FFC0CB"],
  ["Rose", "#FF007F"], ["Blush", "#DE5D83"], ["Salmon", "#FA8072"],
  ["Coral", "#FF6B6B"], ["Burgundy", "#800020"], ["Maroon", "#800000"],
  ["Wine", "#722F37"], ["Crimson", "#DC143C"], ["Red", "#FF0000"],
];

export function hexToName(hex: string): string {
  try {
    const target = chroma(hex).lab();
    let bestName = "Unknown";
    let bestDist = Infinity;

    for (const [name, ref] of COLOR_NAMES) {
      const [l1, a1, b1] = target;
      const [l2, a2, b2] = chroma(ref).lab();
      const dist = Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
      if (dist < bestDist) { bestDist = dist; bestName = name; }
    }

    return bestName;
  } catch {
    return "Unknown";
  }
}
