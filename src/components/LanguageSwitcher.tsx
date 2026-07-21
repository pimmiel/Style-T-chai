"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "th" ? "en" : "th")}
      className="px-3 py-1 text-xs font-medium rounded-full border border-line text-muted-foreground hover:text-ink hover:border-ink transition-colors"
      aria-label="Switch language"
    >
      {lang === "th" ? "EN" : "ไทย"}
    </button>
  );
}
