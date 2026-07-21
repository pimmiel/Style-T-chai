"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STYLE_TAGS, GENDER_TAGS } from "@/lib/mockData";
import { getContrastColor, hexToName } from "@/lib/colorTheory";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useClientValue } from "@/lib/useClientValue";

const OCCASION_TAGS = ["Daily", "Work", "Weekend", "Night Out", "Special Event", "Sport"];
const ROLE_OPTIONS = ["เสื้อ", "กางเกง/กระโปรง", "รองเท้า", "กระเป๋า", "Accessory"];

interface ColorTag { hex: string; role: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyOutfit = Record<string, any>;

interface Props {
  outfit: AnyOutfit;
  onSave: (updated: AnyOutfit) => void;
  onClose: () => void;
}

export default function EditOutfitModal({ outfit, onSave, onClose }: Props) {
  const { t } = useLanguage();
  const [caption, setCaption] = useState(outfit.caption);
  const [styleTag, setStyleTag] = useState(outfit.style_tag);
  const [occasionTag, setOccasionTag] = useState(outfit.occasion_tag);
  const [genderTag, setGenderTag] = useState(outfit.gender_tag);
  const [colors, setColors] = useState<ColorTag[]>(outfit.colors ?? []);
  const [pickerColor, setPickerColor] = useState("#3b82f6");
  const [pickerRole, setPickerRole] = useState("เสื้อ");
  const [showPicker, setShowPicker] = useState(false);
  const hasEyeDropper = useClientValue(() => "EyeDropper" in window, false);

  const pickColorFromScreen = async () => {
    if (!hasEyeDropper) return;
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const result = await eyeDropper.open();
      setPickerColor(result.sRGBHex);
      setShowPicker(true);
    } catch { /* cancelled */ }
  };

  const addColor = () => {
    if (colors.length >= 5) return;
    setColors([...colors, { hex: pickerColor, role: pickerRole }]);
    setShowPicker(false);
  };

  const handleSave = () => {
    const updated = { ...outfit, caption, style_tag: styleTag, occasion_tag: occasionTag, gender_tag: genderTag, colors };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
          <h3 className="font-semibold">{t.card.editOutfit}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 space-y-5 pb-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Caption</Label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t.post.styleLabel.replace(" *", "")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_TAGS.filter((t) => t !== "ทุกสไตล์").map((tag) => (
                <button key={tag} type="button" onClick={() => setStyleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${styleTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Occasion</Label>
            <div className="flex flex-wrap gap-1.5">
              {OCCASION_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => setOccasionTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${occasionTag === tag ? "bg-secondary text-secondary-foreground border-secondary" : "border-border hover:border-secondary/50"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t.post.genderLabel}</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_TAGS.map((tag) => (
                <button key={tag} type="button" onClick={() => setGenderTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${genderTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label className="text-xs">{t.card.maxColors}</Label>
            <div className="flex flex-wrap gap-1.5">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm"
                  style={{ backgroundColor: c.hex, color: getContrastColor(c.hex) }}>
                  <span>{c.role}: {hexToName(c.hex)}</span>
                  <button type="button" onClick={() => setColors(colors.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {colors.length < 5 && (
                <button type="button" onClick={() => setShowPicker(!showPicker)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-muted-foreground/40 hover:border-primary/60 transition-colors">
                  {t.card.addColor}
                </button>
              )}
            </div>

            {showPicker && (
              <div className="border border-border rounded-xl p-3 space-y-3">
                <div className="flex gap-3 items-start flex-wrap">
                  <HexColorPicker color={pickerColor} onChange={setPickerColor} style={{ width: 150, height: 150 }} />
                  <div className="space-y-2 flex-1 min-w-[120px]">
                    <Label className="text-xs block">{t.card.colorRolePart}</Label>
                    <div className="flex flex-wrap gap-1">
                      {ROLE_OPTIONS.map((r) => (
                        <button key={r} type="button" onClick={() => setPickerRole(r)}
                          className={`px-2 py-0.5 rounded text-xs border transition-colors ${pickerRole === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border shadow-sm flex-shrink-0" style={{ backgroundColor: pickerColor }} />
                      <span className="text-xs font-mono">{pickerColor.toUpperCase()}</span>
                      {hasEyeDropper && (
                        <button type="button" onClick={pickColorFromScreen} title="ดูดสี"
                          className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors text-xs">
                          🔬
                        </button>
                      )}
                    </div>
                    <Button type="button" size="sm" onClick={addColor} className="w-full text-xs h-7">
                      {t.card.addThisColor}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 pt-4 flex-shrink-0 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">{t.common.cancel}</Button>
          <Button onClick={handleSave} className="flex-1">{t.common.save}</Button>
        </div>
      </div>
    </div>
  );
}
