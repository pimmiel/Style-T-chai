"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { translations, type Lang, type Translations } from "./translations";

interface LangCtx {
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx>({
  lang: "th",
  t: translations.th,
  setLang: () => {},
});

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, _setLang] = useState<Lang>(initialLang);
  const router = useRouter();

  function setLang(l: Lang) {
    document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
    _setLang(l);
    router.refresh();
  }

  return (
    <Ctx.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLanguage(): LangCtx {
  return useContext(Ctx);
}
