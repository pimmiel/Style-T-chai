"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ProfileTabs() {
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "posts";
  const { t } = useLanguage();

  const TABS = [
    { key: "posts", label: t.profile.tabPosts },
    { key: "saved", label: t.profile.tabSaved },
    { key: "liked", label: t.profile.tabLiked },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-line pb-0">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={key === "posts" ? "/profile" : `/profile?tab=${key}`}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === key
              ? "border-ink text-ink"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
