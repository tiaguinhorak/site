export type EloRankGroup =
  | "silver"
  | "gold"
  | "master_guardian"
  | "elite"
  | "supreme"
  | "global";

export type EloRankTier = {
  id: string;
  group: EloRankGroup;
  minElo: number;
  maxElo: number | null;
  /** i18n key under ranked.eloRanks */
  nameKey: string;
  /** i18n key under ranked.eloGroups */
  groupKey: string;
  colorClass: string;
  bgClass: string;
};

const TIER_STYLES: Record<
  EloRankGroup,
  Pick<EloRankTier, "colorClass" | "bgClass">
> = {
  silver: {
    colorClass: "text-slate-800 dark:text-slate-200",
    bgClass:
      "bg-slate-200/90 dark:bg-slate-400/15 border border-slate-500/45 dark:border-slate-300/30",
  },
  gold: {
    colorClass: "text-amber-950 dark:text-amber-200",
    bgClass:
      "bg-amber-200/90 dark:bg-amber-500/15 border border-amber-600/40 dark:border-amber-400/35",
  },
  master_guardian: {
    colorClass: "text-sky-950 dark:text-sky-200",
    bgClass:
      "bg-sky-200/85 dark:bg-sky-400/15 border border-sky-600/40 dark:border-sky-400/30",
  },
  elite: {
    colorClass: "text-violet-950 dark:text-violet-200",
    bgClass:
      "bg-violet-200/85 dark:bg-violet-400/15 border border-violet-600/40 dark:border-violet-400/30",
  },
  supreme: {
    colorClass: "text-rose-950 dark:text-rose-200",
    bgClass:
      "bg-rose-200/85 dark:bg-rose-400/15 border border-rose-600/40 dark:border-rose-400/30",
  },
  global: {
    colorClass: "text-amber-950 dark:text-amber-300",
    bgClass:
      "bg-gradient-to-r from-amber-200/95 to-yellow-100/90 dark:from-amber-500/20 dark:to-yellow-500/15 border border-amber-600/45 dark:border-amber-400/35",
  },
};

function tier(
  id: string,
  group: EloRankGroup,
  minElo: number,
  maxElo: number | null,
  nameKey: string,
  groupKey: string,
): EloRankTier {
  return {
    id,
    group,
    minElo,
    maxElo,
    nameKey,
    groupKey,
    ...TIER_STYLES[group],
  };
}

/** CS:GO-style competitive ranks mapped to numeric ELO. */
export const ELO_RANK_TIERS: readonly EloRankTier[] = [
  tier("silver_1", "silver", 0, 849, "silver1", "silver"),
  tier("silver_2", "silver", 850, 949, "silver2", "silver"),
  tier("silver_3", "silver", 950, 1049, "silver3", "silver"),
  tier("silver_4", "silver", 1050, 1149, "silver4", "silver"),
  tier("silver_elite", "silver", 1150, 1249, "silverElite", "silver"),
  tier("silver_elite_master", "silver", 1250, 1349, "silverEliteMaster", "silver"),
  tier("gold_1", "gold", 1350, 1449, "gold1", "gold"),
  tier("gold_2", "gold", 1450, 1549, "gold2", "gold"),
  tier("gold_3", "gold", 1550, 1649, "gold3", "gold"),
  tier("gold_4", "gold", 1650, 1749, "gold4", "gold"),
  tier("mg_1", "master_guardian", 1750, 1849, "mg1", "masterGuardian"),
  tier("mg_2", "master_guardian", 1850, 1949, "mg2", "masterGuardian"),
  tier("mg_elite", "master_guardian", 1950, 2049, "mgElite", "masterGuardian"),
  tier("dmg", "elite", 2050, 2199, "dmg", "elite"),
  tier("le", "elite", 2200, 2349, "le", "elite"),
  tier("lem", "elite", 2350, 2499, "lem", "elite"),
  tier("smfc", "supreme", 2500, 2649, "smfc", "supreme"),
  tier("global", "global", 2650, null, "global", "global"),
] as const;

export function getEloRankTier(elo: number): EloRankTier {
  const safe = Math.max(0, Math.floor(elo));
  for (let i = ELO_RANK_TIERS.length - 1; i >= 0; i -= 1) {
    const row = ELO_RANK_TIERS[i]!;
    if (safe >= row.minElo) return row;
  }
  return ELO_RANK_TIERS[0]!;
}

export function getEloProgressInTier(elo: number): {
  tier: EloRankTier;
  progress: number;
  nextTier: EloRankTier | null;
} {
  const current = getEloRankTier(elo);
  const nextIndex = ELO_RANK_TIERS.findIndex((t) => t.id === current.id) + 1;
  const nextTier = nextIndex < ELO_RANK_TIERS.length ? ELO_RANK_TIERS[nextIndex]! : null;

  if (current.maxElo == null || !nextTier) {
    return { tier: current, progress: 1, nextTier: null };
  }

  const span = current.maxElo - current.minElo + 1;
  const progress = Math.min(1, Math.max(0, (elo - current.minElo) / span));
  return { tier: current, progress, nextTier };
}
