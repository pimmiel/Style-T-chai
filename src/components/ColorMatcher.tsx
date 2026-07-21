"use client";

import { useState, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { getColorSchemes, getContrastColor, hexToName, type ColorScheme } from "@/lib/colorTheory";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ColorMatcher() {
  const { t } = useLanguage();
  const [baseColor, setBaseColor] = useState("#9A7240");
  const schemes = getColorSchemes(baseColor);

  const handleCopy = useCallback((hex: string) => {
    navigator.clipboard.writeText(hex);
  }, []);

  return (
    <div className="space-y-10">
      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8">
        {/* Left — picker card */}
        <div className="bg-white rounded-[18px] border border-line p-6 space-y-6 shadow-[0_4px_24px_-8px_rgba(60,45,25,.12)]">
          <div className="text-sm font-medium text-ink">{t.tool.step1}</div>

          {/* Preset grid */}
          <div className="grid grid-cols-6 gap-2">
            {PRESETS.map((hex) => (
              <ColorSwatch
                key={hex}
                hex={hex}
                size="md"
                title={hexToName(hex)}
                selected={baseColor === hex}
                onClick={() => setBaseColor(hex)}
              />
            ))}
          </div>

          {/* Hex color picker */}
          <div className="flex justify-center">
            <HexColorPicker color={baseColor} onChange={setBaseColor} style={{ width: "100%", height: 180 }} />
          </div>

          {/* Selected color summary */}
          <div className="bg-surface-2 rounded-[12px] p-3 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)]"
              style={{ backgroundColor: baseColor }}
            />
            <div>
              <p className="font-serif text-base font-normal text-ink">{hexToName(baseColor)}</p>
              <p className="text-xs font-mono text-muted-foreground">{baseColor.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Right — scheme results */}
        <div className="space-y-4">
          {schemes.slice(0, 2).map((scheme) => (
            <SchemeCard key={scheme.type} scheme={scheme} onCopy={handleCopy} />
          ))}
        </div>
      </div>

      {/* All schemes */}
      <div>
        <Eyebrow className="mb-6">{t.tool.allSchemes}</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schemes.slice(2).map((scheme) => (
            <SchemeCard key={scheme.type} scheme={scheme} onCopy={handleCopy} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchemeCard({ scheme, onCopy }: { scheme: ColorScheme; onCopy: (hex: string) => void }) {
  const { t } = useLanguage();
  const tipKey = scheme.type === "split-complementary" ? "splitComplementary" : scheme.type;
   
  const tip = (t.tool.tips as Record<string, string>)[tipKey] ?? "";
  return (
    <div className="bg-white rounded-[18px] border border-line p-6 space-y-5 shadow-[0_4px_24px_-8px_rgba(60,45,25,.12)]">
      <div>
        <Eyebrow className="mb-2">{scheme.label}</Eyebrow>
        <p className="text-sm text-muted-foreground">{scheme.description}</p>
      </div>

      {/* Palette strip */}
      <div className="flex rounded-[12px] overflow-hidden h-14 border border-line">
        {scheme.colors.map((hex, i) => (
          <button
            key={i}
            onClick={() => onCopy(hex)}
            title={t.tool.copyHex(hex)}
            className="flex-1 flex flex-col items-center justify-end pb-1 transition-opacity hover:opacity-90 text-[10px] font-mono"
            style={{ backgroundColor: hex, color: getContrastColor(hex) }}
          >
            {hex.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Swatches with hex */}
      <div className="flex gap-3 flex-wrap">
        {scheme.colors.map((hex, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className="w-16 h-16 rounded-[10px] border-2 border-white shadow-[0_0_0_1px_var(--color-line)]"
              style={{ backgroundColor: hex }}
            />
            <span className="text-[10px] font-mono text-muted-foreground">{hex.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* Outfit mock-up */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">{t.tool.outfitExample}</p>
        <div className="flex gap-2 items-end">
          {scheme.outfitRoles.map(({ role, color }, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-full rounded-[10px] border border-white/20"
                style={{ backgroundColor: color, height: ROLE_HEIGHTS[role] ?? 56 }}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tip — dark card */}
      <div className="bg-ink rounded-[12px] p-4">
        <p className="text-xs font-medium text-gold mb-1.5">{t.tool.beginnerTip}</p>
        <p className="text-xs text-[#C4BBAC] leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

const PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
  "#8b5cf6", "#ec4899", "#f8fafc", "#94a3b8", "#475569", "#0f172a",
  "#c8a97e", "#a0714f", "#c4734a", "#7a8c50", "#b08090", "#2d4a7a",
  "#fde68a", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fce7f3", "#fed7aa",
];

const ROLE_HEIGHTS: Record<string, number> = {
  "เสื้อ": 80,
  "กางเกง/กระโปรง": 100,
  "รองเท้า": 56,
  "กระเป๋า": 56,
  "Accessory": 44,
};

