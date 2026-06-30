"use client";

import { useCallback, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type PublicProfileShareButtonProps = {
  nickname: string;
  className?: string;
};

export function PublicProfileShareButton({ nickname, className }: PublicProfileShareButtonProps) {
  const t = useTranslations("publicProfile");
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/player/${encodeURIComponent(nickname)}`
        : `/player/${encodeURIComponent(nickname)}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: nickname, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("shareCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("shareFailed"));
    }
  }, [nickname, t]);

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex items-center gap-2 rounded-md glass px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/10",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4 text-primary" />}
      {copied ? t("shareCopiedShort") : t("shareProfile")}
    </button>
  );
}
