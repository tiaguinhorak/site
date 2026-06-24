import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

/** Only users who finished at least one ranked 5v5 match appear on the leaderboard. */
export const LEADERBOARD_PARTICIPANT_WHERE: Prisma.UserWhereInput = {
  OR: [{ rankedWins: { gt: 0 } }, { rankedLosses: { gt: 0 } }],
};

const LEADERBOARD_ORDER: Prisma.UserOrderByWithRelationInput[] = [
  { competitivePoints: "desc" },
  { rankedWins: "desc" },
  { elo: "desc" },
];

export async function syncLeaderboardRanksWithClient(db: PrismaClient): Promise<number> {
  const participants = await db.user.findMany({
    where: LEADERBOARD_PARTICIPANT_WHERE,
    orderBy: LEADERBOARD_ORDER,
    select: { id: true },
  });

  if (participants.length === 0) {
    await db.user.updateMany({ where: { rank: { not: 0 } }, data: { rank: 0 } });
    return 0;
  }

  await db.$transaction(
    participants.map((user, index) =>
      db.user.update({
        where: { id: user.id },
        data: { rank: index + 1 },
      }),
    ),
  );

  const participantIds = participants.map((p) => p.id);
  await db.user.updateMany({
    where: {
      id: { notIn: participantIds },
      rank: { not: 0 },
    },
    data: { rank: 0 },
  });

  return participants.length;
}
