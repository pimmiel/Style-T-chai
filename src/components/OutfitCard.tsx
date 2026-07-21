"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Bookmark, Share2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getContrastColor } from "@/lib/colorTheory";
import ShareToGroupModal from "@/components/ShareToGroupModal";
import EditOutfitModal from "@/components/EditOutfitModal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Outfit = Record<string, any> & {
  id: string;
  image_url: string;
  caption: string;
  style_tag: string;
  occasion_tag: string;
  gender_tag: string;
  author: { name: string; avatar: string };
  colors: { hex: string; role: string }[];
  likes: number;
  saves: number;
  _liked?: boolean;
  _saved?: boolean;
};

interface OutfitCardProps {
  outfit: Outfit;
  isOwner?: boolean;
  showOwnerBadge?: boolean;
  onDelete?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate?: (updated: any) => void;
}

export default function OutfitCard({ outfit, isOwner, showOwnerBadge, onDelete, onUpdate }: OutfitCardProps) {
  const { t } = useLanguage();
  const [liked, setLiked] = useState(outfit._liked ?? false);
  const [saved, setSaved] = useState(outfit._saved ?? false);
  const [likeCount, setLikeCount] = useState(outfit.likes);
  const [saveCount, setSaveCount] = useState(outfit.saves);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [current, setCurrent] = useState(outfit);

  const handleDelete = () => { onDelete?.(current.id); };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = (updated: any) => {
    setCurrent(updated as Outfit);
    setShowEdit(false);
    onUpdate?.(updated);
  };

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    fetch(`/api/posts/${outfit.id}/like`, { method: next ? "POST" : "DELETE" }).catch(() => {
      // revert on error
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    });
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => c + (next ? 1 : -1));
    fetch(`/api/posts/${outfit.id}/save`, { method: next ? "POST" : "DELETE" }).catch(() => {
      setSaved(!next);
      setSaveCount((c) => c + (next ? -1 : 1));
    });
  };

  return (
    <>
      <div className="group bg-surface rounded-[20px] overflow-hidden border border-line shadow-[0_4px_20px_-8px_rgba(60,45,25,.15)] hover:shadow-screen transition-shadow">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
          <Link href={`/post/${current.id}`} className="absolute inset-0 z-0" aria-label={t.card.viewDetail} />
          <Image
            src={current.image_url}
            alt={current.caption}
            fill
            unoptimized={current.image_url.startsWith("data:")}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Owner badge — only when no menu (non-editable contexts) */}
          {showOwnerBadge && !isOwner && (
            <div className="absolute top-3 left-3 z-10">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[rgba(42,38,32,.8)] text-surface">
                {t.card.ownerBadge}
              </span>
            </div>
          )}

          {/* Owner menu */}
          {isOwner && (
            <div className="absolute top-3 left-3 z-10">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div
                  className="absolute top-9 left-0 bg-surface border border-line rounded-[14px] shadow-screen py-1 w-32 z-10"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <button
                    onClick={() => { setShowMenu(false); setShowEdit(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> {t.card.edit}
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-surface-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.card.delete}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={toggleLike}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-ink-soft"}`} />
            </button>
            <button
              onClick={toggleSave}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-primary text-primary" : "text-ink-soft"}`} />
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Share2 className="w-4 h-4 text-ink-soft" />
            </button>
          </div>
        </div>

        {/* Color palette strip */}
        <div className="flex h-5">
          {current.colors.map((c, i) => (
            <div
              key={i}
              className="flex-1 flex items-center justify-center text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: c.hex, color: getContrastColor(c.hex) }}
              title={`${c.role}: ${c.hex}`}
            >
              {c.hex.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <Eyebrow className="text-[11px] tracking-[2px]">{current.style_tag}</Eyebrow>

          <p className="text-sm leading-relaxed line-clamp-2 text-ink">{current.caption}</p>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs border-line text-muted-foreground">{current.occasion_tag}</Badge>
            <Badge variant="outline" className="text-xs border-line text-muted-foreground">{current.gender_tag}</Badge>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-primary">
                {current.author.avatar}
              </div>
              <span className="text-xs text-muted-foreground">{current.author.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button onClick={toggleLike} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                <Heart className={`w-3 h-3 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                {likeCount}
              </button>
              <button onClick={toggleSave} className="flex items-center gap-1 hover:text-primary transition-colors">
                <Bookmark className={`w-3 h-3 ${saved ? "fill-primary text-primary" : ""}`} />
                {saveCount}
              </button>
              <button onClick={() => setShowShare(true)} className="flex items-center gap-1 hover:text-primary transition-colors">
                <Share2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Color swatches */}
          <div className="flex items-center gap-1.5">
            {current.colors.map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)]"
                style={{ backgroundColor: c.hex }}
                title={`${c.role}: ${c.hex}`}
              />
            ))}
          </div>
        </div>
      </div>

      {showShare && (
        <ShareToGroupModal outfit={current} onClose={() => setShowShare(false)} />
      )}
      {showEdit && (
        <EditOutfitModal outfit={current} onSave={handleUpdate} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}
