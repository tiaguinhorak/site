import "server-only";

import type { AchievementMetric, AchievementTier } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AchievementSeed = {
  code: string;
  metric: AchievementMetric;
  threshold: number;
  tier: AchievementTier;
  title: string;
  description: string;
  rewardXp: number;
  rewardCoins: number;
  icon: string;
  sortOrder: number;
};

export const DEFAULT_ACHIEVEMENTS: AchievementSeed[] = [
  // Matches played
  { code: "matches_10", metric: "TOTAL_MATCHES", threshold: 10, tier: "BRONZE", title: "Estreante", description: "Jogue 10 partidas ranqueadas.", rewardXp: 200, rewardCoins: 100, icon: "Swords", sortOrder: 1 },
  { code: "matches_100", metric: "TOTAL_MATCHES", threshold: 100, tier: "SILVER", title: "Regular", description: "Jogue 100 partidas ranqueadas.", rewardXp: 800, rewardCoins: 400, icon: "Swords", sortOrder: 2 },
  { code: "matches_500", metric: "TOTAL_MATCHES", threshold: 500, tier: "GOLD", title: "Veterano", description: "Jogue 500 partidas ranqueadas.", rewardXp: 2500, rewardCoins: 1500, icon: "Swords", sortOrder: 3 },
  // Wins
  { code: "wins_10", metric: "TOTAL_WINS", threshold: 10, tier: "BRONZE", title: "Primeiras vitórias", description: "Vença 10 partidas ranqueadas.", rewardXp: 250, rewardCoins: 120, icon: "Trophy", sortOrder: 4 },
  { code: "wins_100", metric: "TOTAL_WINS", threshold: 100, tier: "GOLD", title: "Campeão", description: "Vença 100 partidas ranqueadas.", rewardXp: 1500, rewardCoins: 900, icon: "Trophy", sortOrder: 5 },
  { code: "wins_300", metric: "TOTAL_WINS", threshold: 300, tier: "DIAMOND", title: "Lenda", description: "Vença 300 partidas ranqueadas.", rewardXp: 4000, rewardCoins: 2500, icon: "Trophy", sortOrder: 6 },
  // Kills
  { code: "kills_1000", metric: "TOTAL_KILLS", threshold: 1000, tier: "SILVER", title: "Atirador", description: "Acumule 1.000 eliminações.", rewardXp: 1000, rewardCoins: 500, icon: "Crosshair", sortOrder: 7 },
  { code: "kills_10000", metric: "TOTAL_KILLS", threshold: 10000, tier: "PLATINUM", title: "Mestre das armas", description: "Acumule 10.000 eliminações.", rewardXp: 3500, rewardCoins: 2200, icon: "Crosshair", sortOrder: 8 },
  // MVPs
  { code: "mvp_50", metric: "TOTAL_MVPS", threshold: 50, tier: "GOLD", title: "Protagonista", description: "Seja MVP 50 vezes.", rewardXp: 1800, rewardCoins: 1000, icon: "Star", sortOrder: 9 },
  // Level
  { code: "level_10", metric: "LEVEL", threshold: 10, tier: "BRONZE", title: "Em ascensão", description: "Alcance o nível 10.", rewardXp: 300, rewardCoins: 150, icon: "Sparkles", sortOrder: 10 },
  { code: "level_50", metric: "LEVEL", threshold: 50, tier: "PLATINUM", title: "Elite", description: "Alcance o nível 50.", rewardXp: 3000, rewardCoins: 2000, icon: "Sparkles", sortOrder: 11 },
];

let seeded = false;

/** Idempotently upsert the default achievement catalog. Cached per process. */
export async function ensureAchievementsSeeded(): Promise<void> {
  if (seeded) return;
  for (const a of DEFAULT_ACHIEVEMENTS) {
    await prisma.achievementDefinition.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        metric: a.metric,
        threshold: a.threshold,
        tier: a.tier,
        title: a.title,
        description: a.description,
        rewardXp: a.rewardXp,
        rewardCoins: a.rewardCoins,
        icon: a.icon,
        sortOrder: a.sortOrder,
      },
      update: {
        metric: a.metric,
        threshold: a.threshold,
        tier: a.tier,
        title: a.title,
        description: a.description,
        rewardXp: a.rewardXp,
        rewardCoins: a.rewardCoins,
        icon: a.icon,
        sortOrder: a.sortOrder,
      },
    });
  }
  seeded = true;
}
