"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { LEADERBOARD_SCORING } from "@/lib/leaderboard/constants";
import { cn } from "@/lib/utils";

type RankingScoringHintProps = {
  className?: string;
};

export function RankingScoringHint({ className }: RankingScoringHintProps) {
  const t = useTranslations("ranking");

  const rows = [
    { label: t("scoringWin"), value: `+${LEADERBOARD_SCORING.winPoints}` },
    { label: t("scoringLoss"), value: `${LEADERBOARD_SCORING.lossPoints}` },
    { label: t("scoringKill"), value: `+${LEADERBOARD_SCORING.killPoints}` },
    { label: t("scoringDeath"), value: `${LEADERBOARD_SCORING.deathPoints}` },
    { label: t("scoringEloWin"), value: `+${LEADERBOARD_SCORING.eloWin}` },
    { label: t("scoringEloLoss"), value: `-${LEADERBOARD_SCORING.eloLoss}` },
  ];

  return (
    <div className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={t("scoringTitle")}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-muted transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Info className="h-4 w-4" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          ?
        </span>
      </button>

      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 w-72 scale-95 rounded-xl border border-border bg-[color-mix(in_srgb,var(--background)_92%,transparent)] p-4 opacity-0 shadow-2xl backdrop-blur-md transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100"
      >
        <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">
          {t("scoringTitle")}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("scoringDesc")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg border border-border/80 px-2 py-1.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {row.label}
              </dt>
              <dd className="mt-0.5 font-display text-sm font-bold text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
