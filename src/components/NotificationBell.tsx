"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Notification } from "@/types/notifications";

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }, [session?.user?.id]);

  useEffect(() => {
    // Async data fetch + polling: setState runs after `await`, not
    // synchronously, so this is a safe effect (rule is a false positive here).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellClick = async () => {
    const wasOpen = open;
    setOpen(!wasOpen);
    if (!wasOpen && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  };

  if (!session?.user?.id) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleBellClick}
        className={cn(
          "p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground relative",
          open && "text-primary"
        )}
        aria-label={t.notifications.label}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-line-2 bg-paper shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line-2">
            <span className="text-sm font-semibold text-ink">{t.notifications.label}</span>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-line-2">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground text-center">
                {t.notifications.empty}
              </li>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} t={t} />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  t,
}: {
  notification: Notification;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const message = (() => {
    switch (n.type) {
      case "post_liked":           return t.notifications.postLiked;
      case "user_followed":        return t.notifications.userFollowed;
      case "group_joined":         return t.notifications.groupJoined(n.payload.groupName);
      case "group_outfit_voted":   return t.notifications.groupOutfitVoted;
      case "group_invite_received": return t.notifications.groupInviteReceived(n.payload.groupName);
      default: return "";
    }
  })();

  return (
    <li
      className={cn(
        "px-4 py-3 text-sm",
        !n.read && "bg-primary/5"
      )}
    >
      <p className="text-ink">{message}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {new Date(n.created_at).toLocaleString()}
      </p>
    </li>
  );
}
