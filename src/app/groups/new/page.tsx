"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function NewGroupPage() {
  const { t } = useLanguage();
  const { status } = useSession();
  const router = useRouter();
  const [hasSub, setHasSub] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => setHasSub(d.subscription?.status === "active"));
  }, [status]);

  if (status === "unauthenticated") {
    signIn(undefined, { callbackUrl: "/groups/new" });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t.common.error);
      setLoading(false);
      return;
    }

    router.push(`/groups/${data.group.id}`);
  }

  if (hasSub === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <Crown className="w-12 h-12 text-primary opacity-60" />
        <h1 className="text-xl font-bold">{t.groups.needSubscription}</h1>
        <p className="text-muted-foreground text-sm">{t.groups.needSubscriptionDesc}</p>
        <Link
          href="/subscription"
          className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          {t.groups.viewPlans}
        </Link>
        <Link href="/groups" className="text-sm text-muted-foreground underline underline-offset-4">
          {t.common.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.common.back}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">{t.groups.newGroup}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t.groups.nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.groups.namePlaceholder}
            maxLength={50}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t.groups.descLabel}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.groups.descPlaceholder}
            maxLength={200}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {loading ? t.groups.creating : t.groups.create}
        </button>
      </form>
    </div>
  );
}
