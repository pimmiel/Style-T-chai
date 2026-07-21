"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <p className="font-[var(--font-serif)] italic text-[var(--accent)] text-xs tracking-[3px] uppercase">
            {t.auth.brandEyebrow}
          </p>
          <h1 className="font-[var(--font-serif)] text-2xl text-[var(--ink)]">{t.auth.forgotTitle}</h1>
        </div>

        <div
          className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4"
          style={{ boxShadow: "var(--shadow-screen)" }}
        >
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <Mail className="w-10 h-10 text-[var(--accent)] mx-auto" />
              <p className="text-sm font-medium text-[var(--ink)]">{t.auth.forgotSentTitle}</p>
              <p className="text-xs text-[var(--ink-soft)]">{t.auth.forgotSentDesc(email)}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm text-[var(--ink-soft)]">{t.auth.forgotDesc}</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                required
                className="w-full px-4 py-2.5 border border-[var(--line)] rounded-xl text-sm bg-[var(--background)] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-[var(--ink)] text-[var(--surface)] hover:bg-[var(--ink-soft)] transition-colors disabled:opacity-60"
              >
                {loading ? t.auth.sendingLink : t.auth.sendReset}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.auth.backToSignIn}
          </Link>
        </div>

      </div>
    </div>
  );
}
