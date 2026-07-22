"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Users2, Plus, ChevronRight, Image, Calendar, Heart, Bell } from "lucide-react";
import type { Group } from "@/lib/supabase";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface UpcomingTheme {
  id: string;
  group_id: string;
  group_name: string;
  plan_date: string;
  theme_name: string;
  occasion: string | null;
  notes: string | null;
}

interface Props {
  initialGroups: Group[];
  hasSub: boolean;
  userId: string | null;
  upcomingThemes?: UpcomingTheme[];
}

export default function GroupsClient({ initialGroups, userId, upcomingThemes = [] }: Props) {
  const { t } = useLanguage();
  const [groups] = useState<Group[]>(initialGroups);

  function daysUntil(dateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  }

  const GROUP_FEATURES = [
    { icon: Image, text: t.groups.feature1 },
    { icon: Calendar, text: t.groups.feature2 },
    { icon: Heart, text: t.groups.feature3 },
  ];

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!userId) {
    return (
      <div className="min-h-[calc(100vh-66px)] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg text-center space-y-8">
          <div className="space-y-3">
            <DisplayHeading as="h1" className="text-4xl">
              {t.groups.heroLine1}
              <br />
              <em>{t.groups.heroEmphasis}</em>
            </DisplayHeading>
            <p className="text-muted-foreground leading-relaxed">{t.groups.heroDesc}</p>
          </div>

          <div className="bg-surface rounded-[18px] border border-line p-5 text-left space-y-3 shadow-[0_4px_20px_-8px_rgba(60,45,25,.12)]">
            {GROUP_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-surface-3 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-ink-soft">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => signIn(undefined, { callbackUrl: "/groups" })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-line rounded-[14px] text-sm font-medium hover:bg-surface-2 transition-colors bg-surface"
          >
            {t.groups.signInCta}
          </button>
        </div>
      </div>
    );
  }

  // ── Authenticated ────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-12 pb-24">
      <div className="flex items-start justify-between mb-10">
        <div className="space-y-2">
          <DisplayHeading as="h1" className="text-3xl">{t.groups.myGroups}</DisplayHeading>
        </div>
        <Link
          href="/groups/new"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-ink text-surface text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.groups.createGroup}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr] gap-8">
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <div className="w-16 h-16 rounded-[18px] bg-surface-3 flex items-center justify-center">
                <Users2 className="w-8 h-8 text-primary/60" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-ink">{t.groups.noGroupsYet}</p>
                <p className="text-muted-foreground text-sm">{t.groups.noGroupsYetDesc}</p>
              </div>
              <Link
                href="/groups/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-ink text-surface text-sm font-medium hover:bg-ink/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.groups.createFirstGroup}
              </Link>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="flex items-center justify-between p-4 rounded-[16px] border border-line hover:border-primary hover:shadow-[0_4px_16px_-6px_rgba(154,114,64,.25)] bg-surface transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #C9A66B, #8A6A44)" }}
                    >
                      <Users2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-ink">{group.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t.groups.membersOfMax(group.member_count ?? 0, group.max_members)}
                        {group.owner_id === userId && (
                          <span className="ml-2 text-primary">· {t.groups.ownerRole}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}

              <Link
                href="/groups/new"
                className="flex items-center justify-center gap-2 p-4 rounded-[16px] border-2 border-dashed border-line-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">{t.groups.addNewGroup}</span>
              </Link>
            </>
          )}
        </div>

        <div className="hidden lg:block bg-surface rounded-[20px] border border-line min-h-[320px] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-ink">แผน Theme ที่กำลังจะมาถึง</p>
          </div>
          {upcomingThemes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Calendar className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">ยังไม่มีแผน Theme ที่กำหนดไว้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingThemes.map((theme) => {
                const days = daysUntil(theme.plan_date);
                const urgency = days === 0 ? "วันนี้!" : days === 1 ? "พรุ่งนี้!" : days <= 7 ? `อีก ${days} วัน` : null;
                return (
                  <Link
                    key={theme.id}
                    href={`/groups/${theme.group_id}`}
                    className="flex items-start gap-3 p-3.5 rounded-[14px] border border-line hover:border-primary/40 hover:bg-surface-2 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${days <= 3 ? "bg-[#FFF3E0]" : "bg-surface-3"}`}>
                      <Calendar className={`w-4.5 h-4.5 ${days <= 3 ? "text-[#E07A1A]" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ink truncate">{theme.theme_name}</p>
                        {urgency && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${days <= 1 ? "bg-red-100 text-red-600" : days <= 3 ? "bg-orange-100 text-orange-600" : "bg-surface-3 text-primary"}`}>
                            {urgency}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{theme.group_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(theme.plan_date).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {theme.occasion && <p className="text-xs text-ink-soft mt-0.5 truncate">{theme.occasion}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
