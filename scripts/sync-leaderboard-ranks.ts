import "dotenv/config";

import { createScriptPrismaClient } from "../lib/prisma-script";
import {
  LEADERBOARD_PARTICIPANT_WHERE,
  syncLeaderboardRanksWithClient,
} from "../lib/leaderboard/sync-ranks-core";

async function backfillRankedAssists(prisma: ReturnType<typeof createScriptPrismaClient>) {
  const users = await prisma.user.findMany({
    where: LEADERBOARD_PARTICIPANT_WHERE,
    select: { id: true },
  });

  for (const user of users) {
    const sum = await prisma.rankedMatchPlayerStat.aggregate({
      where: { userId: user.id },
      _sum: { assists: true },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { rankedAssists: sum._sum.assists ?? 0 },
    });
  }

  if (users.length > 0) {
    console.log(`Backfilled rankedAssists for ${users.length} players.`);
  }
}

async function main() {
  const prisma = createScriptPrismaClient();

  const deleted = await prisma.leaderboardEntry.deleteMany();
  console.log(`Removed ${deleted.count} legacy LeaderboardEntry rows (fake seed data).`);

  const cleaned = await prisma.user.updateMany({
    where: {
      rankedWins: 0,
      rankedLosses: 0,
      competitivePoints: { not: 0 },
    },
    data: { competitivePoints: 0 },
  });
  if (cleaned.count > 0) {
    console.log(
      `Reset competitivePoints for ${cleaned.count} users without ranked matches.`,
    );
  }

  await backfillRankedAssists(prisma);

  const count = await syncLeaderboardRanksWithClient(prisma);
  console.log(`Synced ranks for ${count} ranked players.`);

  const top = await prisma.user.findMany({
    where: { rank: { gt: 0 } },
    orderBy: { rank: "asc" },
    take: 10,
    select: {
      rank: true,
      nickname: true,
      competitivePoints: true,
      rankedWins: true,
      rankedLosses: true,
      elo: true,
    },
  });

  if (top.length === 0) {
    console.log("Leaderboard empty — no ranked matches recorded yet.");
  } else {
    console.log("Top 10:");
    for (const row of top) {
      console.log(
        `#${row.rank} ${row.nickname} — ${row.competitivePoints} pts · ${row.rankedWins}W/${row.rankedLosses}L · ELO ${row.elo}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
