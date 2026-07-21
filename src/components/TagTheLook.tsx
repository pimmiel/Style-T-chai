"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ExternalLink, Plus } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import type { Post, PostItemTag } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// Swatch presets — fashion-neutral palette
const SWATCHES = [
  "#2A2620", "#FAF6EF", "#C9A66B", "#9A7240", "#8A6A44",
  "#6B6156", "#C4BBAC", "#A67B5B", "#D4B896", "#7C6152",
];

interface Props {
  post: Post & { users?: { name: string; image: string } };
  initialTags: PostItemTag[];
  isOwner: boolean;
}

interface Draft {
  x: number;
  y: number;
  name: string;
  brand: string;
  shop: string;
  price: string;
  link: string;
  color: string;
}

export default function TagTheLook({ post, initialTags, isOwner }: Props) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [tags, setTags] = useState<PostItemTag[]>(initialTags);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLDivElement>(null);

  const imageUrl =
    post.post_type === "outfit"
      ? post.image_url
      : post.post_type === "tip"
      ? post.tip_image_url
      : post.images?.[0];

  const handlePhotoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (mode !== "edit") return;
      if ((e.target as HTMLElement).closest("[data-pin]")) return;
      const rect = photoRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setDraft({ x, y, name: "", brand: "", shop: "", price: "", link: "", color: SWATCHES[0] });
      setSelectedId(null);
    },
    [mode]
  );

  const handleSave = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x: Math.round(draft.x * 100) / 100,
          y: Math.round(draft.y * 100) / 100,
          name: draft.name.trim(),
          brand: draft.brand.trim() || null,
          shop: draft.shop.trim() || null,
          price: draft.price.trim() || null,
          link: draft.link.trim() || null,
          color: draft.color,
          position: tags.length,
        }),
      });
      const { tag } = await res.json();
      if (tag) {
        setTags((prev) => [...prev, tag]);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    await fetch(`/api/posts/${post.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagId }),
    });
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    if (selectedId === tagId) setSelectedId(null);
  };

  const authorName = post.users?.name ?? "Unknown";
  const authorImage = post.users?.image;
  const initials = authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/feed" className="text-xs text-muted-foreground hover:text-accent transition-colors">
          ← {t.common.back}
        </Link>
        {isOwner && (
          <div className="flex items-center gap-1 bg-surface-3 rounded-full p-1">
            <button
              onClick={() => { setMode("view"); setDraft(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === "view" ? "bg-surface text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t.card.viewPins}
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === "edit" ? "bg-surface text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t.card.addPins}
            </button>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 items-start">
        {/* Left — Credits */}
        <div className="space-y-6 order-2 lg:order-1">
          <div>
            <Eyebrow>The Credits</Eyebrow>
            <DisplayHeading as="h2" className="text-2xl mt-1">
              {t.card.lookCredits}<em>{t.card.lookCreditsEmphasis}</em>
            </DisplayHeading>
            <p className="text-xs text-muted-foreground mt-1">
              {post.caption ?? post.lookbook_title ?? post.title ?? ""}
              {tags.length > 0 && (
                <span className="text-accent ml-1">· {t.card.itemCount(tags.length)}</span>
              )}
            </p>
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] bg-[#F4EBDA] border border-dashed border-[#C9B392] text-xs text-[#8A6A44]">
              <Plus className="w-3.5 h-3.5 shrink-0" />
              {t.card.tapToPin}
            </div>
          )}

          {/* Item list */}
          <div className="divide-y divide-line">
            {tags.map((tag, i) => {
              const isSelected = selectedId === tag.id;
              return (
                <div
                  key={tag.id}
                  onClick={() => setSelectedId(isSelected ? null : tag.id)}
                  className={`grid grid-cols-[40px_1fr_auto] gap-3 items-center py-4 cursor-pointer transition-colors rounded-[8px] px-2 -mx-2 ${
                    isSelected ? "bg-surface-2" : "hover:bg-surface-3/50"
                  }`}
                >
                  {/* Index */}
                  <span
                    className={`font-serif text-2xl leading-none ${
                      isSelected ? "text-accent" : "text-muted-2"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Info */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {tag.color && (
                        <span
                          className="w-3 h-3 rounded-full shrink-0 ring-1 ring-line"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span className="text-sm font-medium text-ink truncate">{tag.name}</span>
                    </div>
                    {(tag.brand || tag.shop) && (
                      <p className="font-serif text-[11px] tracking-[2px] uppercase text-muted-foreground">
                        {[tag.brand, tag.shop].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {tag.link && (
                      <a
                        href={tag.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover"
                      >
                        {t.card.link} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Price + delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    {tag.price && (
                      <span className="font-serif text-sm text-ink">{tag.price}</span>
                    )}
                    {mode === "edit" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
                        className="text-[11px] text-[#C08A8A] hover:text-[#A06060] transition-colors"
                      >
                        {t.card.remove}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {tags.length === 0 && mode === "view" && (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.card.noItems}</p>
            )}
          </div>

          {/* Author footer */}
          <div className="flex items-center justify-between pt-4 border-t border-line">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-surface shrink-0"
                style={{
                  background: authorImage
                    ? undefined
                    : "linear-gradient(135deg, #C9A66B, #8A6A44)",
                }}
              >
                {authorImage ? (
                  <Image src={authorImage} alt={authorName} width={36} height={36} className="rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{authorName}</p>
                {post.caption && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{post.caption}</p>
                )}
              </div>
            </div>
            <button className="px-4 py-1.5 rounded-full border border-line text-xs font-medium text-ink hover:bg-surface-2 transition-colors">
              {t.card.saveLook}
            </button>
          </div>
        </div>

        {/* Right — Photo */}
        <div className="order-1 lg:order-2 space-y-4">
          <div
            ref={photoRef}
            onClick={handlePhotoClick}
            className={`relative overflow-hidden rounded-[20px] bg-surface-2 min-h-[400px] lg:min-h-[600px] ${
              mode === "edit" ? "cursor-crosshair" : "cursor-default"
            }`}
            style={{ aspectRatio: "3/4" }}
          >
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={post.caption ?? "outfit"}
                fill
                className="object-cover"
                unoptimized={imageUrl.startsWith("data:")}
                sizes="(max-width: 1024px) 100vw, 460px"
              />
            )}

            {/* Existing pins */}
            {tags.map((tag, i) => {
              const isSelected = selectedId === tag.id;
              return (
                <button
                  key={tag.id}
                  data-pin
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(isSelected ? null : tag.id);
                  }}
                  style={{
                    left: `${tag.x}%`,
                    top: `${tag.y}%`,
                    backgroundColor: tag.color ?? "#C9A66B",
                    color: isLight(tag.color ?? "#C9A66B") ? "#2A2620" : "#FAF6EF",
                    transform: isSelected ? "translate(-50%, -50%) scale(1.2)" : "translate(-50%, -50%)",
                    boxShadow: isSelected
                      ? "0 0 0 6px rgba(154,114,64,.25), 0 2px 8px rgba(0,0,0,.3)"
                      : "0 2px 8px rgba(0,0,0,.3)",
                  }}
                  className="absolute w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold transition-transform z-10"
                >
                  {i + 1}
                </button>
              );
            })}

            {/* Draft pin */}
            {draft && (
              <div
                data-pin
                style={{
                  left: `${draft.x}%`,
                  top: `${draft.y}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: draft.color,
                  color: isLight(draft.color) ? "#2A2620" : "#FAF6EF",
                  boxShadow: "0 0 0 6px rgba(154,114,64,.25), 0 2px 8px rgba(0,0,0,.3)",
                }}
                className="absolute w-[30px] h-[30px] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold z-10"
              >
                +
              </div>
            )}
          </div>

          {/* Draft form */}
          {draft && (
            <div className="bg-surface border border-accent/30 rounded-[16px] p-5 space-y-4 shadow-screen">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t.card.pinNewItem}</p>
                <button
                  onClick={() => setDraft(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface-2 text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  placeholder={t.card.itemNamePlaceholder}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FCFAF5] border border-line rounded-[10px] focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder={t.card.brandPlaceholder}
                    value={draft.brand}
                    onChange={(e) => setDraft((d) => d && { ...d, brand: e.target.value })}
                    className="px-3 py-2 text-sm bg-[#FCFAF5] border border-line rounded-[10px] focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
                  />
                  <input
                    placeholder={t.card.pricePlaceholder}
                    value={draft.price}
                    onChange={(e) => setDraft((d) => d && { ...d, price: e.target.value })}
                    className="px-3 py-2 text-sm bg-[#FCFAF5] border border-line rounded-[10px] focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder={t.card.shopPlaceholder}
                    value={draft.shop}
                    onChange={(e) => setDraft((d) => d && { ...d, shop: e.target.value })}
                    className="px-3 py-2 text-sm bg-[#FCFAF5] border border-line rounded-[10px] focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
                  />
                  <input
                    placeholder={t.card.buyLinkPlaceholder}
                    value={draft.link}
                    onChange={(e) => setDraft((d) => d && { ...d, link: e.target.value })}
                    className="px-3 py-2 text-sm bg-[#FCFAF5] border border-line rounded-[10px] focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-2 flex-wrap">
                {SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setDraft((d) => d && { ...d, color: hex })}
                    style={{ backgroundColor: hex }}
                    className={`w-[26px] h-[26px] rounded-full transition-transform hover:scale-110 ${
                      draft.color === hex
                        ? "ring-2 ring-offset-2 ring-accent scale-110"
                        : "ring-1 ring-line"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
                className="w-full py-2 rounded-full bg-ink text-surface text-xs font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {saving ? t.common.saving : t.common.save}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
