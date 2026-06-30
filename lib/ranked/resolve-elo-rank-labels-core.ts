import { getEloRankTier } from "@/lib/ranked/elo-ranks";

export type EloRankLabels = {
  eloRankName: string;
  eloGroupName: string;
};

export function resolveEloRankLabelsSync(
  elo: number,
  tRanks: (key: string) => string,
  tGroups: (key: string) => string,
): EloRankLabels {
  const tier = getEloRankTier(elo);
  return {
    eloRankName: tRanks(tier.nameKey),
    eloGroupName: tGroups(tier.groupKey),
  };
}
