"use client";

import { useTranslations } from "next-intl";
import { LEADERBOARD_SCORING } from "@/lib/leaderboard/constants";

export function RankingScoringInfo() {
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
    <div className="rounded-card glass p-5 sm:p-6">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
        {t("scoringTitle")}
      </h3>
      <p className="mt-2 text-sm text-muted">{t("scoringDesc")}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-border px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {row.label}
            </dt>
            <dd className="mt-0.5 font-display text-lg font-bold text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
