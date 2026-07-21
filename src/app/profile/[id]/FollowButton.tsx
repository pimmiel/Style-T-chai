"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Props {
  userId: string;
  initialFollowing: boolean;
}

export default function FollowButton({ userId, initialFollowing }: Props) {
  const { t } = useLanguage();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    const res = await fetch(`/api/users/${userId}/follow`, {
      method: prev ? "DELETE" : "POST",
    });
    if (!res.ok) setFollowing(prev);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-5 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
        following
          ? "border border-line text-ink hover:bg-surface-2"
          : "bg-ink text-surface hover:opacity-90"
      }`}
    >
      {following ? t.profile.following2 : t.profile.follow}
    </button>
  );
}
