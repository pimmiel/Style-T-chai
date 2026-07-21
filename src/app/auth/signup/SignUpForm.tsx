"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const inputCls =
  "w-full px-4 py-2.5 border border-[var(--line)] rounded-xl text-sm bg-[var(--background)] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors";

const labelCls = "block text-xs font-medium tracking-wide text-[var(--ink-soft)] mb-1.5 uppercase";

export function SignUpForm() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.error === "NO_SUPABASE") {
        window.location.href = "/auth/signin?hint=dev";
        return;
      }
      setError(data.message ?? data.error ?? t.common.error);
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/feed",
      redirect: false,
    });
    if (signInRes?.url) {
      window.location.href = signInRes.url;
    } else {
      window.location.href = "/auth/signin";
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Branding */}
      <div className="mb-8 space-y-1">
        <p
          className="text-xs tracking-[3px] uppercase text-[var(--primary)]"
          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
        >
          {t.auth.brandEyebrow}
        </p>
        <h1
          className="text-3xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {t.auth.signUpTitle}
        </h1>
        <p className="text-sm text-[var(--ink-soft)]">{t.auth.signUpDesc}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className={labelCls}>
            {t.auth.displayNamePlaceholder}
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อที่แสดงในโปรไฟล์"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className={labelCls}>
            {t.auth.emailPlaceholder}
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className={labelCls}>
            {t.auth.passwordMinPlaceholder}
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
            minLength={8}
            className={inputCls}
          />
          <p className="mt-1.5 text-xs text-[var(--muted-2)] leading-relaxed">
            อย่างน้อย 8 ตัวอักษร — รองรับ A–Z, a–z, ตัวเลข 0–9 และอักขระพิเศษ{" "}
            <span className="font-mono">! @ # $ % ^ & *</span>
            {password.length > 0 && (
              <span className={`ml-2 font-medium ${password.length >= 8 ? "text-green-600" : "text-red-500"}`}>
                {password.length >= 8 ? "✓ ผ่าน" : `(${password.length}/8)`}
              </span>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="signup-confirm" className={labelCls}>
            {t.auth.confirmPasswordPlaceholder}
          </label>
          <input
            id="signup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            className={inputCls}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--ink)] cursor-pointer"
          />
          <span className="text-xs text-[var(--ink-soft)] leading-relaxed">
            {t.auth.agreePrefix}{" "}
            <Link href="/privacy" className="underline text-[var(--ink)] hover:text-[var(--ink-soft)]">
              {t.auth.privacyPolicy}
            </Link>
            {" "}{t.auth.and}{" "}
            <Link href="/terms" className="underline text-[var(--ink)] hover:text-[var(--ink-soft)]">
              {t.auth.termsOfService}
            </Link>
            {" "}{t.auth.agreePDPA}
          </span>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name || !email || !password || !confirm || !agreed}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--ink)] text-[var(--surface)] hover:bg-[var(--ink-soft)] transition-colors disabled:opacity-50"
        >
          {loading ? (
            t.auth.registering
          ) : (
            <>
              {t.auth.signUpButton}
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
        {t.auth.hasAccount}{" "}
        <Link
          href="/auth/signin"
          className="text-[var(--ink)] font-medium underline hover:text-[var(--ink-soft)] transition-colors"
        >
          {t.auth.signInLink}
        </Link>
      </p>
    </div>
  );
}
