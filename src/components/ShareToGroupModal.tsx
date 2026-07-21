"use client";

import { useState, useEffect } from "react";
import { X, Send, Check, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Group {
  id: string;
  name: string;
  member_count: number;
}

interface Props {
  outfit: {
    image_url: string;
    caption: string;
    colors: { hex: string; role: string }[];
  };
  onClose: () => void;
}

export default function ShareToGroupModal({ outfit, onClose }: Props) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => setError(t.groups.loadError))
      .finally(() => setLoading(false));
  }, [t.groups.loadError]);

  const share = async (groupId: string) => {
    setSending(groupId);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/outfits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: outfit.image_url,
          caption: outfit.caption,
          colors: outfit.colors,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? t.common.error);
      } else {
        setSent(groupId);
        setTimeout(onClose, 1200);
      }
    } catch {
      setError(t.common.error);
    } finally {
      setSending(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">{t.groups.shareToGroup}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t.common.loading}</p>
        ) : groups.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">{t.groups.noGroups}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => share(g.id)}
                  disabled={!!sending || !!sent}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-left disabled:opacity-60"
                >
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{t.groups.members(g.member_count)}</p>
                  </div>
                  {sent === g.id ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : sending === g.id ? (
                    <span className="text-xs text-muted-foreground">{t.groups.sending}</span>
                  ) : (
                    <Send className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-3 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
