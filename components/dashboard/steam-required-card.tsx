"use client";

import { useTranslations } from "next-intl";
import { SteamIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { STEAM_REQUIRED_MESSAGE } from "@/lib/auth/steam-access";

type SteamRequiredCardProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function SteamRequiredCard({
  title,
  description = STEAM_REQUIRED_MESSAGE,
  className,
}: SteamRequiredCardProps) {
  const t = useTranslations("steam");
  return (
    <div
      className={`rounded-card glass p-6 sm:p-8 ${className ?? ""}`}
    >
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#171a21] text-white ring-1 ring-border">
          <SteamIcon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold text-foreground">{title ?? t("title")}</h3>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <ButtonLink
          href="/api/auth/steam?mode=link"
          variant="primary"
          size="md"
          className="shrink-0"
        >
          <SteamIcon className="h-4 w-4" />
          {t("linkButton")}
        </ButtonLink>
      </div>
    </div>
  );
}
