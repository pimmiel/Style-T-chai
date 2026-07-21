"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Compass } from "lucide-react";
import OutfitCard from "@/components/OutfitCard";
import TipCard from "@/components/TipCard";
import LookbookCard from "@/components/LookbookCard";
import { STYLE_TAGS, GENDER_TAGS, CONTENT_TYPES } from "@/lib/mockData";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { FilterChip } from "@/components/ui/FilterChip";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type ContentType = (typeof CONTENT_TYPES)[number];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialPosts: any[];
  userId: string;
}

export default function FeedClient({ initialPosts, userId }: Props) {
  const { t } = useLanguage();
  const [contentType, setContentType] = useState<ContentType>("ทั้งหมด");
  const [styleFilter, setStyleFilter] = useState("ทุกสไตล์");
  const [genderFilter, setGenderFilter] = useState("ทุกเพศ");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>(initialPosts);

  const filtered = useMemo(() => {
    return posts.filter((idea) => {
      if (contentType === "Outfit" && idea.post_type !== "outfit") return false;
      if (contentType === "Tips" && idea.post_type !== "tip") return false;
      if (contentType === "Lookbook" && idea.post_type !== "lookbook") return false;
      if (styleFilter !== "ทุกสไตล์" && idea.post_type !== "tip") {
        if ("style_tag" in idea && idea.style_tag !== styleFilter) return false;
      }
      if (genderFilter !== "ทุกเพศ" && idea.post_type !== "tip") {
        if ("gender_tag" in idea && idea.gender_tag !== genderFilter && idea.gender_tag !== "ทุกเพศ") return false;
      }
      return true;
    });
  }, [posts, contentType, styleFilter, genderFilter]);

  const handleDelete = async (id: string) => {
    setPosts((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = async (updated: any) => {
    setPosts((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    await fetch(`/api/posts/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-12 pb-24">
      <div className="mb-10 space-y-2">
        <Eyebrow>{t.feed.eyebrow}</Eyebrow>
        <DisplayHeading as="h1" className="text-4xl">
          {t.feed.headingLine1} <em>{t.feed.headingEmphasis}</em>
        </DisplayHeading>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CONTENT_TYPES.map((type) => (
          <FilterChip
            key={type}
            label={type}
            active={contentType === type}
            onClick={() => setContentType(type)}
          />
        ))}
      </div>

      {contentType !== "Tips" && (
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <div className="flex flex-wrap gap-2">
            {STYLE_TAGS.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                active={styleFilter === tag}
                onClick={() => setStyleFilter(tag)}
              />
            ))}
          </div>
          <div className="w-px bg-line self-stretch hidden sm:block" />
          <div className="flex flex-wrap gap-2">
            {GENDER_TAGS.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                active={genderFilter === tag}
                onClick={() => setGenderFilter(tag)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-lg text-muted-foreground">{t.feed.empty}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/post"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-surface text-sm font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t.feed.shareFirst}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line text-ink text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              <Compass className="w-4 h-4" />
              {t.feed.goExplore}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((idea) => {
            const isOwner = idea.user_id === userId;
            if (idea.post_type === "outfit") {
              return (
                <OutfitCard
                  key={idea.id}
                  outfit={idea}
                  isOwner={isOwner}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  showOwnerBadge={isOwner}
                />
              );
            }
            if (idea.post_type === "tip") {
              return <TipCard key={idea.id} tip={idea} />;
            }
            if (idea.post_type === "lookbook") {
              return <LookbookCard key={idea.id} lookbook={idea} />;
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
