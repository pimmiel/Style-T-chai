import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase";

async function fetchCollageImages(): Promise<string[]> {
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("posts")
      .select("post_type, image_url, tip_image_url, images")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(24);

    return (data ?? [])
      .flatMap((p) => {
        if (p.image_url) return [p.image_url as string];
        if (p.tip_image_url) return [p.tip_image_url as string];
        if (Array.isArray(p.images) && p.images[0]) return [p.images[0] as string];
        return [];
      })
      .slice(0, 12);
  } catch {
    return [];
  }
}

function GradientFallback() {
  return (
    <div className="relative h-full w-full bg-[var(--ink)] flex items-end">
      <div className="absolute inset-0 bg-gradient-to-br from-[#3a2e22] via-[var(--ink)] to-[#1a1510]" />
      <div className="relative z-10 p-10">
        <p
          className="text-xs tracking-[4px] uppercase opacity-50 mb-1"
          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--surface)" }}
        >
          Style
        </p>
        <p
          className="text-4xl"
          style={{ fontFamily: "var(--font-serif)", color: "var(--surface)" }}
        >
          T-chai
        </p>
      </div>
    </div>
  );
}

export async function AuthCollage() {
  const images = await fetchCollageImages();

  if (images.length === 0) return <GradientFallback />;

  const rows = Math.ceil(images.length / 2);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--ink)]">
      <div
        className="absolute inset-0 grid grid-cols-2 gap-px"
        style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative overflow-hidden">
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 27vw, 550px"
              priority={i < 4}
            />
          </div>
        ))}
      </div>

      {/* gradient overlay: top fade + bottom fade with brand */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/40 via-transparent to-[var(--ink)]/80 pointer-events-none" />

      {/* Brand mark */}
      <div className="absolute bottom-8 left-8 z-10">
        <p
          className="text-xs tracking-[4px] uppercase opacity-60 mb-0.5"
          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--surface)" }}
        >
          Style
        </p>
        <p
          className="text-4xl leading-none"
          style={{ fontFamily: "var(--font-serif)", color: "var(--surface)" }}
        >
          T-chai
        </p>
      </div>
    </div>
  );
}
