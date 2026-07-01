import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PlacementMatchStats = {
  won: boolean;
  kills: number;
  deaths: number;
};

export type PlacementPreviousStats = {
  position: number;
  totalParticipants: number;
  elo: number;
  kd: number;
  points: number;
  wins: number;
  kills: number;
};

export type PlacementSeed = {
  elo: number;
  competitivePoints: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Computes starting ELO and points after the first ranked match of a new season. */
export function computeSeasonPlacementSeed(
  previous: PlacementPreviousStats | null,
  match: PlacementMatchStats,
): PlacementSeed {
  const matchKd = match.deaths > 0 ? match.kills / match.deaths : match.kills;
  const matchBonus =
    (match.won ? 120 : 40) + match.kills * 4 - match.deaths * 2 + Math.min(60, matchKd * 20);

  if (!previous || previous.totalParticipants <= 0) {
    return {
      elo: clamp(Math.round(900 + matchBonus), 800, 2200),
      competitivePoints: clamp(Math.round((match.won ? 85 : 25) + match.kills * 3), 0, 500),
    };
  }

  const percentile = Math.max(
    0,
    1 - (previous.position - 1) / Math.max(1, previous.totalParticipants - 1),
  );

  const heritageElo =
    1100 + percentile * 1400 + previous.kd * 120 + Math.min(300, previous.wins * 8);
  const heritagePoints =
    150 + percentile * 2200 + previous.points * 0.12 + previous.kills * 0.4;

  return {
    elo: clamp(Math.round(heritageElo * 0.75 + matchBonus * 0.25), 800, 3500),
    competitivePoints: clamp(Math.round(heritagePoints * 0.7 + matchBonus * 2), 0, 15000),
  };
}

export async function seedPlacementRecordsForSeason(
  newSeasonId: string,
  previousSeasonId: string,
): Promise<number> {
  const standings = await prisma.rankedSeasonStanding.findMany({
    where: { seasonId: previousSeasonId },
    select: {
      userId: true,
      position: true,
      elo: true,
      kd: true,
      competitivePoints: true,
      rankedWins: true,
      rankedKills: true,
    },
  });

  if (standings.length === 0) return 0;

  const totalParticipants = standings.length;

  await prisma.userRankedSeasonPlacement.createMany({
    data: standings.map((standing) => ({
      userId: standing.userId,
      seasonId: newSeasonId,
      previousSeasonId,
      previousPosition: standing.position,
      previousElo: standing.elo,
      previousKd: standing.kd,
      previousPoints: standing.competitivePoints,
      previousWins: standing.rankedWins,
      previousKills: standing.rankedKills,
      totalPreviousParticipants: totalParticipants,
    })),
    skipDuplicates: true,
  });

  return standings.length;
}

/** Applies placement seed on the player's first ranked match of the season. */
export async function applySeasonPlacementIfNeeded(
  tx: Prisma.TransactionClient,
  userId: string,
  seasonId: string | null | undefined,
  match: PlacementMatchStats,
): Promise<PlacementSeed | null> {
  if (!seasonId) return null;

  const placement = await tx.userRankedSeasonPlacement.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  });

  if (!placement || placement.placementApplied) return null;

  const previous =
    placement.previousPosition != null && placement.totalPreviousParticipants > 0
      ? {
          position: placement.previousPosition,
          totalParticipants: placement.totalPreviousParticipants,
          elo: placement.previousElo ?? 1000,
          kd: placement.previousKd ?? 0,
          points: placement.previousPoints ?? 0,
          wins: placement.previousWins ?? 0,
          kills: placement.previousKills ?? 0,
        }
      : null;

  const seed = computeSeasonPlacementSeed(previous, match);

  await tx.userRankedSeasonPlacement.update({
    where: { id: placement.id },
    data: {
      placementApplied: true,
      seededElo: seed.elo,
      seededPoints: seed.competitivePoints,
    },
  });

  return seed;
}
