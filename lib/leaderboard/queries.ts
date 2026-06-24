import type { Plan, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { LEADERBOARD_PARTICIPANT_WHERE } from "@/lib/leaderboard/sync-ranks-core";
import type {
  LeaderboardPageResult,
  LeaderboardPlayer,
  LeaderboardSort,
  RankedMatchHistoryEntry,
} from "@/lib/leaderboard/types";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard/types";

export type { LeaderboardPageResult, LeaderboardPlayer, LeaderboardSort };

const USER_SELECT = {
  nickname: true,
  country: true,
  avatarUrl: true,
  avatarPreset: true,
  steamAvatarUrl: true,
  plan: true,
  rank: true,
  elo: true,
  kd: true,
  competitivePoints: true,
  rankedWins: true,
  rankedLosses: true,
  rankedKills: true,
  rankedDeaths: true,
  rankedAssists: true,
  winRate: true,
  matches: true,
} satisfies Prisma.UserSelect;

type LeaderboardUserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

function planToClient(plan: Plan): LeaderboardPlayer["plan"] {
  switch (plan) {
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

function rankedWinRate(user: LeaderboardUserRow): number {
  const total = user.rankedWins + user.rankedLosses;
  if (total > 0) {
    return Math.round((user.rankedWins / total) * 100);
  }
  return user.winRate;
}

function serializeLeaderboardUser(
  user: LeaderboardUserRow,
  rank: number,
): LeaderboardPlayer {
  return {
    rank,
    nickname: user.nickname,
    country: user.country,
    avatarUrl: resolveUserAvatarUrl(user),
    plan: planToClient(user.plan),
    elo: user.elo,
    kd: user.kd,
    points: user.competitivePoints,
    wins: user.rankedWins,
    losses: user.rankedLosses,
    winRate: rankedWinRate(user),
    matches: user.matches,
    kills: user.rankedKills,
    deaths: user.rankedDeaths,
    assists: user.rankedAssists,
  };
}

function orderByForSort(sort: LeaderboardSort): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "elo":
      return [{ elo: "desc" }, { competitivePoints: "desc" }];
    case "kd":
      return [{ kd: "desc" }, { competitivePoints: "desc" }];
    case "wins":
      return [{ rankedWins: "desc" }, { competitivePoints: "desc" }];
    case "winRate":
      return [{ winRate: "desc" }, { competitivePoints: "desc" }];
    default:
      return [{ competitivePoints: "desc" }, { rankedWins: "desc" }];
  }
}

function buildWhere(query?: string): Prisma.UserWhereInput {
  const trimmed = query?.trim();
  if (!trimmed) {
    return LEADERBOARD_PARTICIPANT_WHERE;
  }
  return {
    AND: [
      LEADERBOARD_PARTICIPANT_WHERE,
      { nickname: { contains: trimmed, mode: "insensitive" } },
    ],
  };
}

export async function getLeaderboardRankForUser(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rank: true, rankedWins: true, rankedLosses: true },
  });
  if (!user) return null;
  if (user.rankedWins === 0 && user.rankedLosses === 0) return null;
  return user.rank > 0 ? user.rank : null;
}

export async function fetchLeaderboardPage(options: {
  page?: number;
  limit?: number;
  query?: string;
  sort?: LeaderboardSort;
  userId?: string | null;
}): Promise<LeaderboardPageResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(10, options.limit ?? LEADERBOARD_PAGE_SIZE));
  const sort = options.sort ?? "points";
  const where = buildWhere(options.query);
  const skip = (page - 1) * limit;

  const total = await prisma.user.count({ where });

  const players =
    total === 0
      ? []
      : (
          await prisma.user.findMany({
            where,
            orderBy: orderByForSort(sort),
            skip,
            take: limit,
            select: USER_SELECT,
          })
        ).map((user, index) => serializeLeaderboardUser(user, skip + index + 1));

  let you: LeaderboardPlayer | null = null;
  if (options.userId) {
    const self = await prisma.user.findUnique({
      where: { id: options.userId },
      select: USER_SELECT,
    });
    if (self && (self.rankedWins > 0 || self.rankedLosses > 0)) {
      const globalRank =
        sort === "points" && self.rank > 0
          ? self.rank
          : await computeSortRank(options.userId, sort);
      if (globalRank) {
        you = serializeLeaderboardUser(self, globalRank);
      }
    }
  }

  return {
    players,
    total,
    page,
    limit,
    sort,
    you,
  };
}

async function computeSortRank(userId: string, sort: LeaderboardSort): Promise<number | null> {
  const self = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      competitivePoints: true,
      rankedWins: true,
      rankedLosses: true,
      elo: true,
      kd: true,
      winRate: true,
    },
  });
  if (!self) return null;
  if (self.rankedWins === 0 && self.rankedLosses === 0) return null;

  const ahead = await prisma.user.count({
    where: {
      AND: [
        LEADERBOARD_PARTICIPANT_WHERE,
        buildAheadWhere(sort, self),
      ],
    },
  });

  return ahead + 1;
}

function buildAheadWhere(
  sort: LeaderboardSort,
  self: {
    competitivePoints: number;
    rankedWins: number;
    elo: number;
    kd: number;
    winRate: number;
  },
): Prisma.UserWhereInput {
  switch (sort) {
    case "elo":
      return {
        OR: [
          { elo: { gt: self.elo } },
          { elo: self.elo, competitivePoints: { gt: self.competitivePoints } },
        ],
      };
    case "kd":
      return {
        OR: [
          { kd: { gt: self.kd } },
          { kd: self.kd, competitivePoints: { gt: self.competitivePoints } },
        ],
      };
    case "wins":
      return {
        OR: [
          { rankedWins: { gt: self.rankedWins } },
          {
            rankedWins: self.rankedWins,
            competitivePoints: { gt: self.competitivePoints },
          },
        ],
      };
    case "winRate":
      return {
        OR: [
          { winRate: { gt: self.winRate } },
          {
            winRate: self.winRate,
            competitivePoints: { gt: self.competitivePoints },
          },
        ],
      };
    default:
      return {
        OR: [
          { competitivePoints: { gt: self.competitivePoints } },
          {
            competitivePoints: self.competitivePoints,
            rankedWins: { gt: self.rankedWins },
          },
        ],
      };
  }
}

export async function fetchLeaderboardTop(limit = 50): Promise<LeaderboardPlayer[]> {
  const result = await fetchLeaderboardPage({ page: 1, limit, sort: "points" });
  return result.players;
}

export async function fetchPlayerRankedHistory(
  userId: string,
  limit = 20,
): Promise<RankedMatchHistoryEntry[]> {
  const rows = await prisma.rankedMatchPlayerStat.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kills: true,
      deaths: true,
      assists: true,
      score: true,
      mvp: true,
      won: true,
      session: {
        select: {
          selectedMap: true,
          matchFinishedAt: true,
          scoreTeamA: true,
          scoreTeamB: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    map: row.session.selectedMap,
    finishedAt: row.session.matchFinishedAt?.toISOString() ?? null,
    won: row.won,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    score: row.score,
    mvp: row.mvp,
    scoreTeamA: row.session.scoreTeamA,
    scoreTeamB: row.session.scoreTeamB,
    pointsDelta: null,
  }));
}
