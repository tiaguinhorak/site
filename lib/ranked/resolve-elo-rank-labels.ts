import "server-only";

import { getTranslations } from "next-intl/server";
import {
  resolveEloRankLabelsSync,
  type EloRankLabels,
} from "@/lib/ranked/resolve-elo-rank-labels-core";

export type { EloRankLabels };

export async function resolveEloRankLabels(elo: number): Promise<EloRankLabels> {
  const tRanks = await getTranslations("ranked.eloRanks");
  const tGroups = await getTranslations("ranked.eloGroups");
  return resolveEloRankLabelsSync(elo, tRanks, tGroups);
}
