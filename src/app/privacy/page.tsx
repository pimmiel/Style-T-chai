import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLang, getT } from "@/lib/i18n";

export default async function PrivacyPage() {
  const lang = await getLang();
  const t = getT(lang).privacy;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-12 bg-[var(--background)]">
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="space-y-1">
          <p className="font-[var(--font-serif)] italic text-[var(--accent)] text-xs tracking-[3px] uppercase">
            Style T-chai
          </p>
          <h1 className="font-[var(--font-serif)] text-3xl text-[var(--ink)]">{t.title}</h1>
          <p className="text-sm text-[var(--ink-soft)]">{t.lastUpdated}</p>
        </div>

        <div
          className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-8 space-y-6 text-sm text-[var(--ink-soft)] leading-relaxed"
          style={{ boxShadow: "var(--shadow-screen)" }}
        >
          <section className="space-y-2">
            <h2 className="font-[var(--font-serif)] text-lg text-[var(--ink)]">{t.sec1Title}</h2>
            <p>{t.sec1Body}</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-[var(--font-serif)] text-lg text-[var(--ink)]">{t.sec2Title}</h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              {t.sec2Items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-[var(--font-serif)] text-lg text-[var(--ink)]">{t.sec3Title}</h2>
            <p>{t.sec3Body}</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-[var(--font-serif)] text-lg text-[var(--ink)]">{t.sec4Title}</h2>
            <ul className="list-disc list-inside space-y-1 pl-1">
              {t.sec4Items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <p>{t.sec4Contact} <a href="mailto:privacy@styletchai.com" className="underline text-[var(--ink)]">privacy@styletchai.com</a> {t.sec4ContactSuffix}</p>
          </section>

          <p className="text-xs text-[var(--ink-soft)] pt-2 border-t border-[var(--line)]">
            {t.draft}
          </p>
        </div>

        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.backLink}
        </Link>

      </div>
    </div>
  );
}
