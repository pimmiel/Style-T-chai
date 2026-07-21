import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Bookmark } from "lucide-react";
import { MOCK_TIPS } from "@/lib/mockData";
import { Eyebrow } from "@/components/ui/Eyebrow";

export default async function TipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tip = MOCK_TIPS.find((t) => t.id === id);
  if (!tip) notFound();

  const lines = (tip.full_body ?? tip.body).split("\n");

  return (
    <div className="min-h-screen bg-ink text-surface">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#C4BBAC] hover:text-surface transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Link>

        {/* Header */}
        <Eyebrow className="text-gold mb-4">{tip.tags[0] ?? "Tips"}</Eyebrow>
        <h1 className="font-serif text-3xl lg:text-4xl font-normal leading-snug mb-6">
          {tip.title}
        </h1>

        {/* Author + meta */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-[rgba(255,255,255,.1)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[rgba(201,166,107,.2)] flex items-center justify-center text-sm font-semibold text-gold">
              {tip.author.avatar}
            </div>
            <div>
              <p className="text-sm font-medium text-surface">{tip.author.name}</p>
              <p className="text-xs text-[#8A8175]">
                {new Date(tip.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#8A8175]">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" /> {tip.likes}
            </span>
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4" /> {tip.saves}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="prose prose-invert prose-sm max-w-none space-y-4">
          {lines.map((line, i) => {
            if (line.trim() === "") return <div key={i} className="h-2" />;

            if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
              return (
                <h2 key={i} className="font-serif text-xl text-gold mt-8 mb-3">
                  {line.replace(/\*\*/g, "")}
                </h2>
              );
            }

            // Inline bold
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i} className="text-[#C4BBAC] leading-relaxed">
                {parts.map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j} className="text-surface font-medium">
                      {part.replace(/\*\*/g, "")}
                    </strong>
                  ) : (
                    part
                  )
                )}
              </p>
            );
          })}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-[rgba(255,255,255,.1)]">
          {tip.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs border border-[rgba(255,255,255,.15)] text-[#C4BBAC]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
