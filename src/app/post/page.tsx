"use client";

import { useState, useRef, useEffect } from "react";
import { useClientValue } from "@/lib/useClientValue";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { HexColorPicker } from "react-colorful";
import { Upload, Plus, X, Pipette, Shirt, Lightbulb, BookImage, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getContrastColor, hexToName } from "@/lib/colorTheory";
import { STYLE_TAGS, OCCASION_TAGS, GENDER_TAGS, TIP_TAGS } from "@/lib/mockData";
const ROLE_OPTIONS = ["เสื้อ", "กางเกง/กระโปรง", "รองเท้า", "กระเป๋า", "Accessory"];

type PostType = "outfit" | "tip" | "lookbook";

interface ColorTag {
  hex: string;
  role: string;
}

const POST_TYPES: { value: PostType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "outfit", label: "Outfit", desc: "แชร์ look ของวันนี้", icon: Shirt },
  { value: "tip", label: "Tips", desc: "เคล็ดลับการแต่งตัว", icon: Lightbulb },
  { value: "lookbook", label: "Lookbook", desc: "รวม look หลายชุด", icon: BookImage },
];

export default function PostPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<PostType>("outfit");

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (session === null) {
      router.push("/auth/signin?callbackUrl=/post");
    }
  }, [session, router]);

  // Outfit fields
  const [preview, setPreview] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [styleTag, setStyleTag] = useState("");
  const [customStyleTag, setCustomStyleTag] = useState("");
  const [showCustomStyle, setShowCustomStyle] = useState(false);
  const [occasionTag, setOccasionTag] = useState("");
  const [customOccasionTag, setCustomOccasionTag] = useState("");
  const [showCustomOccasion, setShowCustomOccasion] = useState(false);
  const [genderTag, setGenderTag] = useState("ทุกเพศ");
  const [colors, setColors] = useState<ColorTag[]>([]);
  const [pickerColor, setPickerColor] = useState("#3b82f6");
  const [pickerRole, setPickerRole] = useState("เสื้อ");
  const [showPicker, setShowPicker] = useState(false);
  const hasEyeDropper = useClientValue(() => "EyeDropper" in window, false);

  // Tip fields
  const [tipTitle, setTipTitle] = useState("");
  const [tipBody, setTipBody] = useState("");
  const [tipImageFile, setTipImageFile] = useState<File | null>(null);
  const [tipImagePreview, setTipImagePreview] = useState<string | null>(null);
  const [tipTags, setTipTags] = useState<string[]>([]);

  // Lookbook fields
  const [lbTitle, setLbTitle] = useState("");
  const [lbDesc, setLbDesc] = useState("");
  const [lbFiles, setLbFiles] = useState<File[]>([]);
  const [lbPreviews, setLbPreviews] = useState<string[]>([]);
  const [lbStyleTag, setLbStyleTag] = useState("");
  const [lbGenderTag, setLbGenderTag] = useState("ทุกเพศ");

  const [visibility, setVisibility] = useState<("explore" | "community")[]>(["explore", "community"]);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setFileObj(file);
  };

  const handleTipImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTipImagePreview(URL.createObjectURL(file));
    setTipImageFile(file);
  };

  const handleLookbookImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 6 - lbFiles.length;
    const batch = files.slice(0, remaining);
    batch.forEach((file) => {
      setLbPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      setLbFiles((prev) => [...prev, file]);
    });
  };

  const removeLbImage = (i: number) => {
    setLbFiles((prev) => prev.filter((_, idx) => idx !== i));
    setLbPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addColor = () => {
    if (colors.length >= 5) return;
    setColors([...colors, { hex: pickerColor, role: pickerRole }]);
    setShowPicker(false);
  };

  const removeColor = (i: number) => setColors(colors.filter((_, idx) => idx !== i));

  const pickColorFromScreen = async () => {
    if (!hasEyeDropper) return;
    try {
      const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const result = await eyeDropper.open();
      setPickerColor(result.sRGBHex);
      setShowPicker(true);
    } catch {
      // user cancelled
    }
  };

  const toggleTipTag = (tag: string) => {
    setTipTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      const meta: Record<string, unknown> = { postType, visibility };

      if (postType === "outfit") {
        Object.assign(meta, { caption, styleTag, occasionTag: occasionTag || "Daily", genderTag, colors });
        if (fileObj) fd.append("image", fileObj);
      } else if (postType === "tip") {
        Object.assign(meta, { tipTitle, tipBody, tipTags });
        if (tipImageFile) fd.append("tipImage", tipImageFile);
      } else {
        Object.assign(meta, { lbTitle, lbDesc, lbStyleTag, lbGenderTag });
        lbFiles.forEach((f) => fd.append("images", f));
      }

      fd.append("metadata", JSON.stringify(meta));
      const res = await fetch("/api/posts", { method: "POST", body: fd });
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          errorMsg = `HTTP ${res.status} — ${await res.text().catch(() => "ไม่ทราบสาเหตุ")}`;
        }
        alert(errorMsg);
        return;
      }
      router.push(visibility.includes("community") ? "/feed" : "/");
    } finally {
      setSubmitting(false);
    }
  };

  const isOutfitValid = !!fileObj && !!styleTag;
  const isTipValid = tipTitle.trim().length > 0 && tipBody.trim().length > 0;
  const isLookbookValid = lbFiles.length >= 2 && lbTitle.trim().length > 0;
  const isValid = (postType === "outfit" ? isOutfitValid : postType === "tip" ? isTipValid : isLookbookValid) && visibility.length > 0;

  const toggleVisibility = (v: "explore" | "community") => {
    setVisibility((prev) =>
      prev.includes(v)
        ? prev.length > 1 ? prev.filter((x) => x !== v) : prev  // ต้องเลือกอย่างน้อย 1
        : [...prev, v]
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">แชร์ไอเดีย</h1>
        <p className="text-muted-foreground mt-2">เลือกประเภทไอเดียที่ต้องการแชร์</p>
      </div>

      {/* Post type selector */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {POST_TYPES.map(({ value, label, desc, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPostType(value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors text-center ${
              postType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <Icon className={`w-6 h-6 ${postType === value ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className={`font-semibold text-sm ${postType === value ? "text-primary" : ""}`}>{label}</div>
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ─── OUTFIT FORM ─── */}
        {postType === "outfit" && (
          <>
            <div>
              <Label className="mb-2 block">รูป Outfit *</Label>
              {preview ? (
                <div className="relative w-full max-w-xs mx-auto aspect-[4/5] rounded-2xl overflow-hidden border">
                  <Image src={preview} alt="preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPreview(null); setFileObj(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {hasEyeDropper && (
                    <button type="button" onClick={pickColorFromScreen} title="ดูดสีจากรูป"
                      className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                      <Pipette className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full max-w-xs mx-auto aspect-[4/5] rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors block">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">คลิกเพื่ออัปโหลดรูป</span>
                  <span className="text-xs text-muted-foreground/60">JPG, PNG, WEBP (สูงสุด 10MB)</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <div>
              <Label className="mb-2 block">สีที่ใส่ (สูงสุด 5 สี)</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
                    style={{ backgroundColor: c.hex, color: getContrastColor(c.hex) }}>
                    <span>{c.role}: {hexToName(c.hex)}</span>
                    <button type="button" onClick={() => removeColor(i)}><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {colors.length < 5 && (
                  <button type="button" onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-muted-foreground/40 hover:border-primary/60 transition-colors">
                    <Plus className="w-3 h-3" /> เพิ่มสี
                  </button>
                )}
              </div>
              {showPicker && (
                <Card className="p-4">
                  <CardContent className="p-0 space-y-4">
                    <div className="flex gap-4 items-start flex-wrap">
                      <HexColorPicker color={pickerColor} onChange={setPickerColor} style={{ width: 180, height: 180 }} />
                      <div className="space-y-3 flex-1 min-w-[150px]">
                        <div>
                          <Label className="text-xs mb-1 block">ส่วนนี้คือ</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLE_OPTIONS.map((r) => (
                              <button key={r} type="button" onClick={() => setPickerRole(r)}
                                className={`px-2 py-1 rounded text-xs border transition-colors ${pickerRole === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border shadow-sm flex-shrink-0" style={{ backgroundColor: pickerColor }} />
                          <span className="text-xs font-mono">{pickerColor.toUpperCase()}</span>
                          {hasEyeDropper && (
                            <button type="button" onClick={pickColorFromScreen} title="ดูดสีจากรูป"
                              className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">
                              <Pipette className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <Button type="button" size="sm" onClick={addColor} className="w-full">เพิ่มสีนี้</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <Label htmlFor="caption" className="mb-2 block">Caption</Label>
              <Input id="caption" placeholder="เล่าถึง outfit นี้สั้นๆ..." value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />
              <p className="text-xs text-muted-foreground mt-1 text-right">{caption.length}/200</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <Label className="mb-2 block">สไตล์ *</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.filter(t => t !== "ทุกสไตล์").map((tag) => (
                    <button key={tag} type="button" onClick={() => { setStyleTag(tag); setShowCustomStyle(false); setCustomStyleTag(""); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${styleTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                      {tag}
                    </button>
                  ))}
                  {showCustomStyle ? (
                    <input
                      autoFocus
                      type="text"
                      value={customStyleTag}
                      onChange={(e) => { setCustomStyleTag(e.target.value); setStyleTag(e.target.value); }}
                      onBlur={() => { if (!customStyleTag) setShowCustomStyle(false); }}
                      placeholder="พิมพ์สไตล์..."
                      className="px-3 py-1 rounded-full text-xs border border-primary bg-primary/5 outline-none w-28"
                    />
                  ) : (
                    <button type="button" onClick={() => setShowCustomStyle(true)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-border hover:border-primary/50 text-muted-foreground">
                      + กำหนดเอง
                    </button>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Occasion</Label>
                <div className="flex flex-wrap gap-2">
                  {OCCASION_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => { setOccasionTag(tag); setShowCustomOccasion(false); setCustomOccasionTag(""); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${occasionTag === tag ? "bg-secondary text-secondary-foreground border-secondary" : "border-border hover:border-secondary/50"}`}>
                      {tag}
                    </button>
                  ))}
                  {showCustomOccasion ? (
                    <input
                      autoFocus
                      type="text"
                      value={customOccasionTag}
                      onChange={(e) => { setCustomOccasionTag(e.target.value); setOccasionTag(e.target.value); }}
                      onBlur={() => { if (!customOccasionTag) setShowCustomOccasion(false); }}
                      placeholder="พิมพ์ occasion..."
                      className="px-3 py-1 rounded-full text-xs border border-secondary bg-secondary/5 outline-none w-32"
                    />
                  ) : (
                    <button type="button" onClick={() => setShowCustomOccasion(true)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-border hover:border-secondary/50 text-muted-foreground">
                      + กำหนดเอง
                    </button>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">เพศ</Label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => setGenderTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${genderTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── TIP FORM ─── */}
        {postType === "tip" && (
          <>
            <div>
              <Label htmlFor="tipTitle" className="mb-2 block">หัวข้อ *</Label>
              <Input id="tipTitle" placeholder="เช่น กฎ 60-30-10 สำหรับมือใหม่" value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} maxLength={100} />
              <p className="text-xs text-muted-foreground mt-1 text-right">{tipTitle.length}/100</p>
            </div>

            <div>
              <Label htmlFor="tipBody" className="mb-2 block">เนื้อหา *</Label>
              <textarea
                id="tipBody"
                placeholder="อธิบายเคล็ดลับนี้ให้ละเอียด..."
                value={tipBody}
                onChange={(e) => setTipBody(e.target.value)}
                maxLength={500}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{tipBody.length}/500</p>
            </div>

            <div>
              <Label className="mb-2 block">รูปประกอบ (ไม่บังคับ)</Label>
              {tipImagePreview ? (
                <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border">
                  <Image src={tipImagePreview} alt="tip image" fill className="object-cover" />
                  <button type="button"
                    onClick={() => { setTipImagePreview(null); setTipImageFile(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button type="button"
                  onClick={() => { const el = document.getElementById("tip-file-input") as HTMLInputElement; el?.click(); }}
                  className="w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">อัปโหลดรูปประกอบ</span>
                </button>
              )}
              <input id="tip-file-input" type="file" accept="image/*" className="hidden" onChange={handleTipImage} />
            </div>

            <div>
              <Label className="mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {TIP_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTipTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tipTags.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── LOOKBOOK FORM ─── */}
        {postType === "lookbook" && (
          <>
            <div>
              <Label className="mb-2 block">รูป (2–6 รูป) *</Label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {lbPreviews.map((src, i) => (
                  <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border bg-muted">
                    <Image src={src} alt="" fill className="object-cover" />
                    <button type="button" onClick={() => removeLbImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {lbFiles.length < 6 && (
                  <button type="button" onClick={() => multiFileRef.current?.click()}
                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">เพิ่มรูป</span>
                  </button>
                )}
              </div>
              <input ref={multiFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleLookbookImages} />
              <p className="text-xs text-muted-foreground">{lbFiles.length}/6 รูป (ต้องการอย่างน้อย 2)</p>
            </div>

            <div>
              <Label htmlFor="lbTitle" className="mb-2 block">ชื่อ Lookbook *</Label>
              <Input id="lbTitle" placeholder="เช่น Monochrome Week — 7 วันกับ 7 โทนสี" value={lbTitle} onChange={(e) => setLbTitle(e.target.value)} maxLength={100} />
            </div>

            <div>
              <Label htmlFor="lbDesc" className="mb-2 block">คำอธิบาย</Label>
              <textarea
                id="lbDesc"
                placeholder="เล่าถึง lookbook นี้..."
                value={lbDesc}
                onChange={(e) => setLbDesc(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">สไตล์ *</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.filter(t => t !== "ทุกสไตล์").map((tag) => (
                    <button key={tag} type="button" onClick={() => setLbStyleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${lbStyleTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">เพศ</Label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => setLbGenderTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${lbGenderTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Visibility selector */}
        <div>
          <Label className="mb-3 block">โพสต์ไปที่ไหน *</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => toggleVisibility("explore")}
              className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                visibility.includes("explore") ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <Sparkles className={`w-5 h-5 flex-shrink-0 ${visibility.includes("explore") ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <div className={`text-sm font-medium ${visibility.includes("explore") ? "text-primary" : ""}`}>Explore</div>
                <div className="text-xs text-muted-foreground">ทุกคนเห็น</div>
              </div>
              {visibility.includes("explore") && (
                <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleVisibility("community")}
              className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                visibility.includes("community") ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <Users className={`w-5 h-5 flex-shrink-0 ${visibility.includes("community") ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <div className={`text-sm font-medium ${visibility.includes("community") ? "text-primary" : ""}`}>Community</div>
                <div className="text-xs text-muted-foreground">เฉพาะ feed ของคุณ</div>
              </div>
              {visibility.includes("community") && (
                <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">ยกเลิก</Button>
          <Button type="submit" disabled={!isValid || submitting} className="flex-1">
            {submitting ? "กำลังโพสต์..." : "แชร์ไอเดีย"}
          </Button>
        </div>
      </form>
    </div>
  );
}
