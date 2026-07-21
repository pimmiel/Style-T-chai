"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Users, Plus, Bookmark, Heart, UserCircle, Users2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const path = usePathname();
  const { t } = useLanguage();

  const NAV_LINKS = [
    { href: "/", label: t.nav.explore, icon: Sparkles },
    { href: "/feed", label: t.nav.community, icon: Users },
    { href: "/groups", label: t.nav.groups, icon: Users2 },
    { href: "/tool", label: t.nav.colorTool, icon: Palette },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line-2 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="max-w-[1120px] mx-auto px-10 h-[66px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0 text-base select-none">
          <span className="font-serif text-[18px] font-normal text-ink">Style</span>
          <span className="font-serif text-[18px] italic text-primary ml-1">T-chai</span>
        </Link>

        {/* Center nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground",
                  active && "text-ink border-b border-primary"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <Link
            href="/likes"
            className={cn(
              "p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground",
              path === "/likes" && "text-primary"
            )}
            aria-label={t.nav.likes}
          >
            <Heart className="w-4 h-4" />
          </Link>
          <Link
            href="/bookmarks"
            className={cn(
              "p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground",
              path === "/bookmarks" && "text-primary"
            )}
            aria-label={t.nav.saved}
          >
            <Bookmark className="w-4 h-4" />
          </Link>
          <NotificationBell />
          <Link
            href="/profile"
            className={cn(
              "p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground",
              path === "/profile" && "text-primary"
            )}
            aria-label={t.nav.profile}
          >
            <UserCircle className="w-4 h-4" />
          </Link>
          <Link
            href="/post"
            className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-surface text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.nav.shareIdea}</span>
            <span className="sm:hidden">{t.nav.shareShort}</span>
          </Link>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-paper border-t border-line flex">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors",
              path === href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
        <Link
          href="/likes"
          className={cn(
            "flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors",
            path === "/likes" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Heart className="w-5 h-5" />
          {t.nav.likes}
        </Link>
        <Link
          href="/bookmarks"
          className={cn(
            "flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors",
            path === "/bookmarks" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Bookmark className="w-5 h-5" />
          {t.nav.saved}
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors",
            path === "/profile" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <UserCircle className="w-5 h-5" />
          {t.nav.profile}
        </Link>
      </div>
    </header>
  );
}
