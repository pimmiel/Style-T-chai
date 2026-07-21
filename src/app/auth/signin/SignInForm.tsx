"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const LINE_GREEN = "#06C755";

const inputCls =
  "w-full px-4 py-2.5 border border-[var(--line)] rounded-xl text-sm bg-[var(--background)] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-colors";

const labelCls = "block text-xs font-medium tracking-wide text-[var(--ink-soft)] mb-1.5 uppercase";

function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex-1 h-px bg-[var(--line)]" />
      <span className="text-xs text-[var(--muted-2)]">{label}</span>
      <div className="flex-1 h-px bg-[var(--line)]" />
    </div>
  );
}

export function SignInForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/feed";
  const isDevHint = searchParams.get("hint") === "dev";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const hasSocial =
    process.env.NEXT_PUBLIC_LINE_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  async function handleSocialSignIn(provider: string) {
    setLoading(provider);
    await signIn(provider, { callbackUrl });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading("credentials");
    setError("");
    let res = await signIn("credentials", { email, password, callbackUrl, redirect: false });
    if (res?.error) {
      res = await signIn("dev", { email, password, callbackUrl, redirect: false });
    }
    setLoading(null);
    if (res?.error) {
      setError(t.auth.invalidCredentials);
    } else if (res?.url) {
      window.location.href = res.url;
    }
  }

  const isLoading = loading !== null;

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
          {t.auth.signInTitle}
        </h1>
        <p className="text-sm text-[var(--ink-soft)]">{t.auth.signInDesc}</p>
      </div>

      {isDevHint && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
          <p className="font-medium">โหมดทดสอบ (ไม่มี Supabase)</p>
          <p>
            กรอก email ใดก็ได้ + รหัสผ่าน{" "}
            <code className="bg-amber-100 px-1 rounded">changeme</code>
          </p>
        </div>
      )}

      <div className="space-y-4">
        {hasSocial && (
          <div className="space-y-2.5">
            {process.env.NEXT_PUBLIC_LINE_ENABLED === "true" && (
              <button
                onClick={() => handleSocialSignIn("line")}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: LINE_GREEN }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" aria-hidden>
                  <path d="M19.365 9.863c.349 0 .63.285.63.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                {t.auth.withLine}
              </button>
            )}
            {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
              <button
                onClick={() => handleSocialSignIn("google")}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t.auth.withGoogle}
              </button>
            )}
          </div>
        )}

        {hasSocial && <Divider label={t.auth.orDivider} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-email" className={labelCls}>
              {t.auth.emailPlaceholder}
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="signin-password" className={labelCls.replace(" mb-1.5", "")}>
                {t.auth.passwordPlaceholder}
              </label>
              <Link
                href="/auth/forgot"
                className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className={inputCls}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--ink)] text-[var(--surface)] hover:bg-[var(--ink-soft)] transition-colors disabled:opacity-50"
          >
            {loading === "credentials" ? (
              t.auth.signingIn
            ) : (
              <>
                {t.auth.signInButton}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
        {t.auth.noAccount}{" "}
        <Link
          href="/auth/signup"
          className="text-[var(--ink)] font-medium underline hover:text-[var(--ink-soft)] transition-colors"
        >
          {t.auth.signUpLink}
        </Link>
      </p>
    </div>
  );
}
