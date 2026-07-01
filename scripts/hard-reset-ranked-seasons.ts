/**
 * Reset total do sistema de temporadas rankeadas.
 * Uso: npx tsx scripts/hard-reset-ranked-seasons.ts
 */
import "dotenv/config";

import { createScriptPrismaClient } from "../lib/prisma-script";
import { syncLeaderboardRanksWithClient } from "../lib/leaderboard/sync-ranks-core";

const USER_RANKED_RESET = {
  rank: 0,
  elo: 1000,
  kd: 0,
  competitivePoints: 0,
  rankedWins: 0,
  rankedLosses: 0,
  rankedKills: 0,
  rankedDeaths: 0,
  rankedAssists: 0,
  rankedMvps: 0,
  rankedHeadshots: 0,
  rankedDamage: 0,
  rankedRoundsPlayed: 0,
  rankedClutches: 0,
  rankedUtilityDamage: 0,
  rankedEnemiesFlashed: 0,
  rankedAwpKills: 0,
  winRate: 0,
} as const;

async function main() {
  const prisma = createScriptPrismaClient();

  const deletedSeasons = await prisma.rankedSeason.count();
  console.log(`Temporadas existentes: ${deletedSeasons}`);

  await prisma.$transaction(async (tx) => {
    await tx.userRankedSeasonPlacement.deleteMany({});
    await tx.rankedSeasonPrizeGrant.deleteMany({});
    await tx.rankedSeasonStanding.deleteMany({});
    await tx.rankedSeasonPrize.deleteMany({});
    await tx.rankedMatchSession.updateMany({ data: { seasonId: null } });
    await tx.rankedSeason.deleteMany({});
    const users = await tx.user.updateMany({ data: USER_RANKED_RESET });
    console.log(`Stats rankeados zerados para ${users.count} usuários.`);
  });

  await syncLeaderboardRanksWithClient(prisma);

  const seasonId = `season-1-${Date.now()}`;
  const season = await prisma.rankedSeason.create({
    data: {
      id: seasonId,
      code: "season-1",
      name: "Season 1",
      seasonNumber: 1,
      description: "Temporada reiniciada — ranking zerado.",
      startsAt: new Date(),
      status: "ACTIVE",
      active: true,
      prizes: {
        createMany: {
          data: [1, 2, 3].map((position) => ({
            id: `${seasonId}-prize-${position}`,
            position,
            rewardType: "COINS",
            label: `${position}º lugar`,
            enabled: false,
          })),
        },
      },
    },
  });

  console.log(`Nova temporada criada: ${season.name} (${season.id})`);
  console.log("Reset completo.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
