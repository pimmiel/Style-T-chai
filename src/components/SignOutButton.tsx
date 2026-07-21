"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function SignOutButton() {
  const { t } = useLanguage();
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      {t.profile.signOut}
    </Button>
  );
}
