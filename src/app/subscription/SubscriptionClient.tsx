"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Check, Crown } from "lucide-react";
import { PLAN_DETAILS } from "@/lib/plans";
import { useSearchParams } from "next/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Props {
  initialPlan: number | null;
}

export default function SubscriptionClient({ initialPlan }: Props) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "1";
  const [loading, setLoading] = useState<number | null>(null);
  const [currentPlan] = useState<number | null>(initialPlan);

  async function handleSubscribe(members: number) {
    if (!session) {
      signIn(undefined, { callbackUrl: "/subscription" });
      return;
    }
    setLoading(members);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: members }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-16 pb-24">
      <div className="text-center mb-14 space-y-3">
        <Eyebrow>{t.subscription.eyebrow}</Eyebrow>
        <DisplayHeading as="h1" className="text-4xl lg:text-5xl">
          {t.subscription.headingLine1} <em>{t.subscription.headingEmphasis}</em> {t.subscription.headingLine2}
        </DisplayHeading>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t.subscription.desc}
        </p>
      </div>

      {success && (
        <div className="mb-10 p-4 rounded-[14px] bg-green-50 border border-green-200 text-green-800 text-center text-sm font-medium">
          {t.subscription.successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLAN_DETAILS.map((plan) => {
          const isActive = currentPlan === plan.members;
          const isPopular = plan.members === 5;

          return (
            <div
              key={plan.members}
              className={`relative rounded-[20px] border p-7 flex flex-col gap-5 ${
                isPopular
                  ? "bg-ink text-surface border-ink shadow-popular"
                  : "bg-surface border-line shadow-[0_4px_20px_-8px_rgba(60,45,25,.12)]"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-[13px] left-1/2 -translate-x-1/2">
                  <span className="bg-gold text-ink text-xs font-semibold px-4 py-1 rounded-full">
                    {t.subscription.popular}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className={`w-4 h-4 ${isPopular ? "text-gold" : "text-primary"}`} />
                  <span className={`font-semibold text-lg ${isPopular ? "text-surface" : "text-ink"}`}>
                    {plan.label}
                  </span>
                </div>
                <p className={`text-sm ${isPopular ? "text-[#C4BBAC]" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className={`font-serif text-[46px] font-normal leading-none ${isPopular ? "text-gold" : "text-ink"}`}>
                  {plan.price}
                </span>
                <span className={`text-sm ${isPopular ? "text-[#C4BBAC]" : "text-muted-foreground"}`}>{t.subscription.priceUnit}</span>
              </div>

              <ul className="space-y-2.5 text-sm flex-1">
                {[
                  t.subscription.featureMembers(plan.members),
                  t.subscription.featurePost,
                  t.subscription.featureTheme,
                  t.subscription.featurePlan,
                  t.subscription.featureVote,
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-gold" : "text-primary"}`} />
                    <span className={isPopular ? "text-[#C4BBAC]" : "text-ink-soft"}>{feat}</span>
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div className={`w-full py-2.5 rounded-full text-sm font-medium text-center ${
                  isPopular ? "bg-[rgba(255,255,255,.1)] text-surface" : "bg-surface-2 text-primary"
                }`}>
                  {t.subscription.currentPlan}
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.members)}
                  disabled={loading === plan.members}
                  className={`w-full py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 ${
                    isPopular
                      ? "bg-gold text-ink hover:bg-gold/90"
                      : "border border-line text-ink hover:bg-surface-2"
                  }`}
                >
                  {loading === plan.members ? t.groups.subscribing : t.subscription.subscribe}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-muted-foreground text-xs mt-10">
        {t.subscription.footer}
      </p>
    </div>
  );
}
