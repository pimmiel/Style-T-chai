"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Palette, Sparkles, Users } from "lucide-react";
import { MOCK_IDEAS, STYLE_TAGS, CONTENT_TYPES } from "@/lib/mockData";
import OutfitCard from "@/components/OutfitCard";
import TipCard from "@/components/TipCard";
import LookbookCard from "@/components/LookbookCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { FilterChip } from "@/components/ui/FilterChip";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type ContentType = (typeof CONTENT_TYPES)[number];

export default function LandingPage() {
  const { t } = useLanguage();
  const [contentType, setContentType] = useState<ContentType>("ทั้งหมด");
  const [styleFilter, setStyleFilter] = useState("ทุกสไตล์");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [publicIdeas, setPublicIdeas] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/posts?visibility=explore")
      .then((r) => r.json())
      .then(({ posts }) => setPublicIdeas(posts ?? []))
      .catch(() => {});
  }, []);

  const allIdeas = useMemo(() => {
    const combined = [...publicIdeas, ...MOCK_IDEAS];
    const seen = new Set<string>();
    return combined.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [publicIdeas]);

  const filtered = useMemo(() => {
    return allIdeas.filter((idea) => {
      if (contentType === "Outfit" && idea.post_type !== "outfit") return false;
      if (contentType === "Tips" && idea.post_type !== "tip") return false;
      if (contentType === "Lookbook" && idea.post_type !== "lookbook") return false;
      if (styleFilter !== "ทุกสไตล์") {
        if (idea.post_type === "tip") return false;
        if ("style_tag" in idea && idea.style_tag !== styleFilter) return false;
      }
      return true;
    });
  }, [allIdeas, contentType, styleFilter]);

  const VALUE_PROPS = [
    { icon: Sparkles, title: t.landing.feature1Title, desc: t.landing.feature1Desc },
    { icon: Palette, title: t.landing.feature2Title, desc: t.landing.feature2Desc },
    { icon: Users, title: t.landing.feature3Title, desc: t.landing.feature3Desc },
  ];

  return (
    <div className="pb-24">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 lg:px-10 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_.98fr] gap-12 items-start">
          {/* Left column */}
          <div className="space-y-8">
            <Eyebrow>{t.landing.eyebrow}</Eyebrow>
            <DisplayHeading as="h1" className="text-5xl lg:text-[60px]">
              {t.landing.heroLine1}<br />
              {t.landing.heroLine2}{" "}
              <em>{t.landing.heroEmphasis}</em>
            </DisplayHeading>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
              {t.landing.heroDesc}
            </p>
            <div className="flex items-center flex-wrap gap-3">
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-surface text-sm font-medium hover:bg-ink/90 transition-colors"
              >
                {t.landing.exploreCta}
              </Link>
              <Link
                href="/post"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-line text-ink text-sm font-medium hover:bg-surface-2 transition-colors"
              >
                {t.landing.shareCta}
              </Link>
            </div>
            {/* Stats */}
            <div className="flex items-center gap-10 pt-4">
              {[
                { num: "12k+", label: t.landing.statIdeas },
                { num: "3.4k", label: t.landing.statUsers },
                { num: "500+", label: t.landing.statGroups },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div className="font-serif text-3xl font-normal text-ink">{num}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — decorative palette card */}
          <div className="hidden lg:block relative">
            <div className="bg-surface rounded-[20px] border border-line p-8 shadow-screen space-y-6">
              <Eyebrow>{t.landing.paletteEyebrow}</Eyebrow>
              <DisplayHeading className="text-2xl">
                {t.landing.paletteHeading} <em>{t.landing.paletteEmphasis}</em>
              </DisplayHeading>
              <div className="flex gap-3">
                {["#EDE6DA", "#C9A66B", "#9A7240", "#4A443B", "#2A2620"].map((hex) => (
                  <div
                    key={hex}
                    className="flex-1 h-16 rounded-[12px] border-2 border-white shadow-[0_0_0_1px_var(--color-line)]"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{t.landing.paletteDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value props ──────────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 lg:px-10 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="space-y-4">
              <div className="w-12 h-12 bg-surface-3 rounded-[14px] flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <DisplayHeading as="h3" className="text-lg">
                {title}
              </DisplayHeading>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Browse ideas ─────────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 lg:px-10 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Eyebrow>{t.landing.journalEyebrow}</Eyebrow>
            <DisplayHeading className="text-3xl">
              {t.landing.ideasHeading}<em>{t.landing.ideasEmphasis}</em>
            </DisplayHeading>
          </div>
          <span className="hidden sm:block font-serif italic text-sm text-muted-foreground">
            {t.landing.ideasCount(filtered.length)}
          </span>
        </div>

        {/* Filters */}
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
          <div className="flex flex-wrap gap-2 mb-8">
            {STYLE_TAGS.map((tag) => (
              <FilterChip
                key={tag}
                label={tag}
                active={styleFilter === tag}
                onClick={() => setStyleFilter(tag)}
              />
            ))}
          </div>
        )}

        {/* Masonry grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">{t.landing.emptyFilter}</p>
            <button
              onClick={() => { setContentType("ทั้งหมด"); setStyleFilter("ทุกสไตล์"); }}
              className="mt-3 text-sm text-primary underline"
            >
              {t.landing.clearFilter}
            </button>
          </div>
        ) : (
          <div
            className="gap-6"
            style={{ columnCount: 1, columnGap: "24px" }}
          >
            <style>{`
              @media (min-width: 640px) { .masonry-grid { column-count: 2; } }
              @media (min-width: 1024px) { .masonry-grid { column-count: 3; } }
            `}</style>
            <div className="masonry-grid" style={{ columnGap: "24px" }}>
              {filtered.map((idea) => {
                const el = idea.post_type === "outfit" ? (
                  <OutfitCard key={idea.id} outfit={idea} />
                ) : idea.post_type === "tip" ? (
                  <TipCard key={idea.id} tip={idea} />
                ) : idea.post_type === "lookbook" ? (
                  <LookbookCard key={idea.id} lookbook={idea} />
                ) : null;
                if (!el) return null;
                return (
                  <div key={idea.id} style={{ breakInside: "avoid", marginBottom: "24px" }}>
                    {el}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
      <section className="max-w-[1120px] mx-auto px-6 lg:px-10 pb-20">
        <div className="bg-ink rounded-[18px] px-10 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center sm:text-left">
            <DisplayHeading className="text-3xl text-surface">
              {t.landing.ctaHeading} <em className="text-gold">{t.landing.ctaEmphasis}</em>{t.landing.ctaHeadingEnd}
            </DisplayHeading>
            <p className="text-muted-2 text-sm">{t.landing.ctaDesc}</p>
          </div>
          <Link
            href="/post"
            className="shrink-0 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gold text-ink font-semibold text-sm hover:bg-gold/90 transition-colors shadow-popular"
          >
            {t.landing.ctaButton}
          </Link>
        </div>
      </section>

      {/* ── Color Matcher CTA ────────────────────────────────────────────── */}
      <div className="max-w-[1120px] mx-auto px-6 lg:px-10 flex flex-col items-center gap-3 text-center pb-10">
        <p className="text-sm text-muted-foreground">{t.landing.colorMatcherCta}</p>
        <Link
          href="/tool"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line hover:border-primary/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Palette className="w-4 h-4" />
          {t.landing.colorMatcherLink}
        </Link>
      </div>

      {/* FAB */}
      <Link
        href="/post"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full bg-ink text-surface shadow-screen hover:bg-ink/90 flex items-center justify-center transition-all z-40"
        aria-label={t.nav.shareIdea}
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
