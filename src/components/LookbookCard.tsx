"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Bookmark, Images } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type LookbookPost = {
  id: string;
  post_type: "lookbook";
  title: string;
  description?: string;
  images: string[];
  style_tag: string;
  gender_tag: string;
  author: { name: string; avatar: string };
  likes: number;
  saves: number;
  _liked?: boolean;
  _saved?: boolean;
};

function ImgWithFallback({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="absolute inset-0 bg-surface-3" />;
  return <Image src={src} alt={alt} fill className={className ?? "object-cover"} sizes={sizes} onError={() => setErr(true)} />;
}

export default function LookbookCard({ lookbook }: { lookbook: LookbookPost }) {
  const [liked, setLiked] = useState(lookbook._liked ?? false);
  const [saved, setSaved] = useState(lookbook._saved ?? false);
  const [likeCount, setLikeCount] = useState(lookbook.likes);
  const [saveCount, setSaveCount] = useState(lookbook.saves);

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    fetch(`/api/posts/${lookbook.id}/like`, { method: next ? "POST" : "DELETE" }).catch(() => {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    });
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => c + (next ? 1 : -1));
    fetch(`/api/posts/${lookbook.id}/save`, { method: next ? "POST" : "DELETE" }).catch(() => {
      setSaved(!next);
      setSaveCount((c) => c + (next ? -1 : 1));
    });
  };

  const { t } = useLanguage();
  const { images } = lookbook;
  const extraCount = images.length > 4 ? images.length - 4 : 0;
  const displayImages = images.slice(0, 4);

  return (
    <div className="bg-surface rounded-[20px] overflow-hidden border border-line shadow-[0_4px_20px_-8px_rgba(60,45,25,.15)] hover:shadow-screen transition-shadow">
      {/* Image grid */}
      <div className="relative">
        {displayImages.length === 1 && (
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
            <ImgWithFallback src={displayImages[0]} alt={lookbook.title} sizes="(max-width: 640px) 100vw, 50vw" />
          </div>
        )}
        {displayImages.length === 2 && (
          <div className="grid grid-cols-2 gap-px aspect-[4/3]">
            {displayImages.map((src, i) => (
              <div key={i} className="relative overflow-hidden bg-surface-2">
                <ImgWithFallback src={src} alt="" sizes="25vw" />
              </div>
            ))}
          </div>
        )}
        {displayImages.length >= 3 && (
          <div className="grid grid-cols-2 gap-px">
            <div className="relative aspect-square overflow-hidden bg-surface-2 row-span-2">
              <ImgWithFallback src={displayImages[0]} alt="" sizes="25vw" />
            </div>
            <div className="grid grid-rows-2 gap-px">
              {displayImages.slice(1, 3).map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden bg-surface-2">
                  <ImgWithFallback src={src} alt="" sizes="15vw" />
                </div>
              ))}
            </div>
            {displayImages[3] && (
              <div className="relative aspect-square overflow-hidden bg-surface-2 col-start-2">
                <ImgWithFallback src={displayImages[3]} alt="" sizes="15vw" />
                {extraCount > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                    +{extraCount}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs">
          <Images className="w-3 h-3" />
          {t.card.imageCount(images.length)}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <Eyebrow className="text-[11px] tracking-[2px]">
          {t.card.lookbookEyebrow(images.length)}
        </Eyebrow>
        <h3 className="font-serif text-base font-normal leading-snug line-clamp-2 text-ink">{lookbook.title}</h3>
        {lookbook.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{lookbook.description}</p>
        )}

        <div className="flex gap-1.5">
          <Badge variant="outline" className="text-xs border-line text-muted-foreground">{lookbook.style_tag}</Badge>
          <Badge variant="outline" className="text-xs border-line text-muted-foreground">{lookbook.gender_tag}</Badge>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-primary">
              {lookbook.author.avatar}
            </div>
            <span className="text-xs text-muted-foreground">{lookbook.author.name}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
