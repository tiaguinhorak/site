"use client";

import { useTranslations } from "next-intl";
import { EloRankBadge } from "@/components/ranked/elo-rank-badge";
import { resolveEloRankLabelsSync } from "@/lib/ranked/resolve-elo-rank-labels-core";

type EloRankBadgeI18nProps = {
  elo: number;
  showNumeric?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Client wrapper — use only where SSR snapshot is not required. */
export function EloRankBadgeI18n(props: EloRankBadgeI18nProps) {
  const tRanks = useTranslations("ranked.eloRanks");
  const tGroups = useTranslations("ranked.eloGroups");
  const labels = resolveEloRankLabelsSync(props.elo, tRanks, tGroups);

  return (
    <EloRankBadge
      elo={props.elo}
      rankName={labels.eloRankName}
      groupName={labels.eloGroupName}
      showNumeric={props.showNumeric}
      size={props.size}
      className={props.className}
    />
  );
}
