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
  { code: "matches_50", metric: "TOTAL_MATCHES", threshold: 50, tier: "BRONZE", title: "Comprometido", description: "Jogue 50 partidas ranqueadas.", rewardXp: 400, rewardCoins: 200, icon: "Swords", sortOrder: 2 },
  { code: "matches_100", metric: "TOTAL_MATCHES", threshold: 100, tier: "SILVER", title: "Regular", description: "Jogue 100 partidas ranqueadas.", rewardXp: 800, rewardCoins: 400, icon: "Swords", sortOrder: 3 },
  { code: "matches_500", metric: "TOTAL_MATCHES", threshold: 500, tier: "GOLD", title: "Veterano", description: "Jogue 500 partidas ranqueadas.", rewardXp: 2500, rewardCoins: 1500, icon: "Swords", sortOrder: 4 },
  { code: "matches_1000", metric: "TOTAL_MATCHES", threshold: 1000, tier: "PLATINUM", title: "Incansável", description: "Jogue 1.000 partidas ranqueadas.", rewardXp: 5000, rewardCoins: 3000, icon: "Swords", sortOrder: 5 },
  // Wins
  { code: "wins_10", metric: "TOTAL_WINS", threshold: 10, tier: "BRONZE", title: "Primeiras vitórias", description: "Vença 10 partidas ranqueadas.", rewardXp: 250, rewardCoins: 120, icon: "Trophy", sortOrder: 6 },
  { code: "wins_50", metric: "TOTAL_WINS", threshold: 50, tier: "SILVER", title: "Competidor", description: "Vença 50 partidas ranqueadas.", rewardXp: 900, rewardCoins: 450, icon: "Trophy", sortOrder: 7 },
  { code: "wins_100", metric: "TOTAL_WINS", threshold: 100, tier: "GOLD", title: "Campeão", description: "Vença 100 partidas ranqueadas.", rewardXp: 1500, rewardCoins: 900, icon: "Trophy", sortOrder: 8 },
  { code: "wins_300", metric: "TOTAL_WINS", threshold: 300, tier: "DIAMOND", title: "Lenda", description: "Vença 300 partidas ranqueadas.", rewardXp: 4000, rewardCoins: 2500, icon: "Trophy", sortOrder: 9 },
  { code: "wins_500", metric: "TOTAL_WINS", threshold: 500, tier: "DIAMOND", title: "Dominador", description: "Vença 500 partidas ranqueadas.", rewardXp: 6000, rewardCoins: 4000, icon: "Trophy", sortOrder: 10 },
  // Kills
  { code: "kills_500", metric: "TOTAL_KILLS", threshold: 500, tier: "BRONZE", title: "Primeiros abates", description: "Acumule 500 eliminações.", rewardXp: 500, rewardCoins: 250, icon: "Crosshair", sortOrder: 11 },
  { code: "kills_1000", metric: "TOTAL_KILLS", threshold: 1000, tier: "SILVER", title: "Atirador", description: "Acumule 1.000 eliminações.", rewardXp: 1000, rewardCoins: 500, icon: "Crosshair", sortOrder: 12 },
  { code: "kills_5000", metric: "TOTAL_KILLS", threshold: 5000, tier: "GOLD", title: "Precisão letal", description: "Acumule 5.000 eliminações.", rewardXp: 2200, rewardCoins: 1200, icon: "Crosshair", sortOrder: 13 },
  { code: "kills_10000", metric: "TOTAL_KILLS", threshold: 10000, tier: "PLATINUM", title: "Mestre das armas", description: "Acumule 10.000 eliminações.", rewardXp: 3500, rewardCoins: 2200, icon: "Crosshair", sortOrder: 14 },
  { code: "kills_25000", metric: "TOTAL_KILLS", threshold: 25000, tier: "DIAMOND", title: "Aniquilador", description: "Acumule 25.000 eliminações.", rewardXp: 8000, rewardCoins: 5000, icon: "Crosshair", sortOrder: 15 },
  // Assists
  { code: "assists_100", metric: "TOTAL_ASSISTS", threshold: 100, tier: "BRONZE", title: "Apoio tático", description: "Registre 100 assistências.", rewardXp: 300, rewardCoins: 150, icon: "Target", sortOrder: 16 },
  { code: "assists_500", metric: "TOTAL_ASSISTS", threshold: 500, tier: "SILVER", title: "Team player", description: "Registre 500 assistências.", rewardXp: 900, rewardCoins: 450, icon: "Target", sortOrder: 17 },
  { code: "assists_2000", metric: "TOTAL_ASSISTS", threshold: 2000, tier: "GOLD", title: "Facilitador", description: "Registre 2.000 assistências.", rewardXp: 2000, rewardCoins: 1100, icon: "Target", sortOrder: 18 },
  { code: "assists_5000", metric: "TOTAL_ASSISTS", threshold: 5000, tier: "PLATINUM", title: "Utility master", description: "Registre 5.000 assistências.", rewardXp: 4000, rewardCoins: 2500, icon: "Target", sortOrder: 19 },
  // MVPs
  { code: "mvp_10", metric: "TOTAL_MVPS", threshold: 10, tier: "BRONZE", title: "Destaque inicial", description: "Seja MVP 10 vezes.", rewardXp: 400, rewardCoins: 200, icon: "Star", sortOrder: 20 },
  { code: "mvp_50", metric: "TOTAL_MVPS", threshold: 50, tier: "GOLD", title: "Protagonista", description: "Seja MVP 50 vezes.", rewardXp: 1800, rewardCoins: 1000, icon: "Star", sortOrder: 21 },
  { code: "mvp_200", metric: "TOTAL_MVPS", threshold: 200, tier: "PLATINUM", title: "Estrela da arena", description: "Seja MVP 200 vezes.", rewardXp: 4500, rewardCoins: 2800, icon: "Star", sortOrder: 22 },
  { code: "mvp_500", metric: "TOTAL_MVPS", threshold: 500, tier: "DIAMOND", title: "Ícone do servidor", description: "Seja MVP 500 vezes.", rewardXp: 9000, rewardCoins: 6000, icon: "Star", sortOrder: 23 },
  // Level
  { code: "level_10", metric: "LEVEL", threshold: 10, tier: "BRONZE", title: "Em ascensão", description: "Alcance o nível 10.", rewardXp: 300, rewardCoins: 150, icon: "Sparkles", sortOrder: 24 },
  { code: "level_25", metric: "LEVEL", threshold: 25, tier: "SILVER", title: "Experiente", description: "Alcance o nível 25.", rewardXp: 800, rewardCoins: 400, icon: "Sparkles", sortOrder: 25 },
  { code: "level_50", metric: "LEVEL", threshold: 50, tier: "PLATINUM", title: "Elite", description: "Alcance o nível 50.", rewardXp: 3000, rewardCoins: 2000, icon: "Sparkles", sortOrder: 26 },
  { code: "level_75", metric: "LEVEL", threshold: 75, tier: "DIAMOND", title: "Veterano absoluto", description: "Alcance o nível 75.", rewardXp: 5500, rewardCoins: 3500, icon: "Sparkles", sortOrder: 27 },
  { code: "level_100", metric: "LEVEL", threshold: 100, tier: "DIAMOND", title: "Lenda viva", description: "Alcance o nível 100.", rewardXp: 10000, rewardCoins: 7000, icon: "Sparkles", sortOrder: 28 },
  // Lifetime coins
  { code: "coins_1000", metric: "LIFETIME_COINS", threshold: 1000, tier: "BRONZE", title: "Primeira fortuna", description: "Acumule 1.000 moedas no total.", rewardXp: 200, rewardCoins: 100, icon: "Coins", sortOrder: 29 },
  { code: "coins_10000", metric: "LIFETIME_COINS", threshold: 10000, tier: "SILVER", title: "Investidor", description: "Acumule 10.000 moedas no total.", rewardXp: 1000, rewardCoins: 500, icon: "Coins", sortOrder: 30 },
  { code: "coins_50000", metric: "LIFETIME_COINS", threshold: 50000, tier: "GOLD", title: "Magnata", description: "Acumule 50.000 moedas no total.", rewardXp: 3500, rewardCoins: 2000, icon: "Coins", sortOrder: 31 },
  { code: "coins_100000", metric: "LIFETIME_COINS", threshold: 100000, tier: "DIAMOND", title: "Tesouro infinito", description: "Acumule 100.000 moedas no total.", rewardXp: 8000, rewardCoins: 5000, icon: "Coins", sortOrder: 32 },
];

let seeded = false;

/** Idempotently upsert the default achievement catalog. Cached per process. */
export async function ensureAchievementsSeeded(): Promise<void> {
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
