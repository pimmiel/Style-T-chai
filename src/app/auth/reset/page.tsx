"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function ResetContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-[var(--ink-soft)]">{t.auth.invalidLink}</p>
        <Link href="/auth/forgot" className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] underline transition-colors">
          {t.auth.requestNewLink}
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t.auth.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.passwordMismatch);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t.common.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/auth/signin"), 2500);
  }

  return (
    <div
      className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4"
      style={{ boxShadow: "var(--shadow-screen)" }}
    >
      {done ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-sm font-medium text-[var(--ink)]">{t.auth.resetSuccess}</p>
          <p className="text-xs text-[var(--ink-soft)]">{t.auth.resetSuccessDesc}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.newPasswordPlaceholder}
            required
            minLength={8}
            className="w-full px-4 py-2.5 border border-[var(--line)] rounded-xl text-sm bg-[var(--background)] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-colors"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t.auth.confirmNewPasswordPlaceholder}
            required
            minLength={8}
            className="w-full px-4 py-2.5 border border-[var(--line)] rounded-xl text-sm bg-[var(--background)] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-colors"
          />
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-[var(--ink)] text-[var(--surface)] hover:bg-[var(--ink-soft)] transition-colors disabled:opacity-60"
          >
            {loading ? t.auth.savingPassword : <>{t.auth.setNewPassword} <ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <p className="font-[var(--font-serif)] italic text-[var(--accent)] text-xs tracking-[3px] uppercase">
            {t.auth.brandEyebrow}
          </p>
          <h1 className="font-[var(--font-serif)] text-2xl text-[var(--ink)]">{t.auth.resetTitle}</h1>
        </div>

        <Suspense>
          <ResetContent />
        </Suspense>

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
          >
            {t.auth.backToSignIn}
          </Link>
        </div>

      </div>
    </div>
  );
}
