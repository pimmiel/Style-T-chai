"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Bookmark } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

type TipPost = {
  id: string;
  post_type: "tip";
  title: string;
  body: string;
  image_url?: string;
  tags: string[];
  author: { name: string; avatar: string };
  likes: number;
  saves: number;
  _liked?: boolean;
  _saved?: boolean;
};

export default function TipCard({ tip }: { tip: TipPost }) {
  const [liked, setLiked] = useState(tip._liked ?? false);
  const [saved, setSaved] = useState(tip._saved ?? false);
  const [likeCount, setLikeCount] = useState(tip.likes);
  const [saveCount, setSaveCount] = useState(tip.saves);
  const [imgError, setImgError] = useState(false);

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    fetch(`/api/posts/${tip.id}/like`, { method: next ? "POST" : "DELETE" }).catch(() => {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    });
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => c + (next ? 1 : -1));
    fetch(`/api/posts/${tip.id}/save`, { method: next ? "POST" : "DELETE" }).catch(() => {
      setSaved(!next);
      setSaveCount((c) => c + (next ? -1 : 1));
    });
  };

  return (
    <div className="bg-ink rounded-[20px] overflow-hidden border border-ink shadow-[0_4px_20px_-8px_rgba(60,45,25,.25)] hover:shadow-screen transition-shadow">
      {tip.image_url && !imgError && (
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={tip.image_url}
            alt={tip.title}
            fill
            className="object-cover opacity-80"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      <div className="p-5 space-y-4">
        <Eyebrow className="text-gold">{tip.tags[0] ?? "Tips"}</Eyebrow>

        <h3 className="font-serif text-lg font-normal leading-snug text-surface line-clamp-2">
          {tip.title}
        </h3>

        <p className="text-sm text-[#C4BBAC] leading-relaxed line-clamp-3">{tip.body}</p>

        <div className="flex flex-wrap gap-1.5">
          {tip.tags.slice(1).map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full text-xs border border-[rgba(255,255,255,.15)] text-[#C4BBAC]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[rgba(201,166,107,.2)] flex items-center justify-center text-xs font-semibold text-gold">
              {tip.author.avatar}
            </div>
            <span className="text-xs text-[#C4BBAC]">{tip.author.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#8A8175]">
            <button onClick={toggleLike} className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <Heart className={`w-3 h-3 ${liked ? "fill-red-400 text-red-400" : ""}`} />
              {likeCount}
            </button>
            <button onClick={toggleSave} className="flex items-center gap-1 hover:text-gold transition-colors">
              <Bookmark className={`w-3 h-3 ${saved ? "fill-gold text-gold" : ""}`} />
              {saveCount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
