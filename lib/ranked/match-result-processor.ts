import "server-only";

import { prisma } from "@/lib/prisma";
import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { syncLeaderboardRanks } from "@/lib/leaderboard/sync-ranks";
import { abandonRankedSessionInternal } from "@/lib/ranked/reconcile-stale-sessions";
import { notifySessionParticipants, notifyRankedRooms } from "@/lib/realtime/notify";
import { triggerQueueMatchmaking } from "@/lib/ranked/queue-service";
import { steamIdVariants } from "@/lib/steam/steam-id";

const WIN_POINTS = 100;
const LOSS_POINTS = -15;
const KILL_POINTS = 2;
const DEATH_POINTS = -1;
const ELO_WIN = 25;
const ELO_LOSS = 20;

export type MatchResultPlayerInput = {
  steamId: string;
  team: "A" | "B";
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  mvp: number;
};

export type MatchResultInput = {
  csgoMatchId: string;
  roomId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: string | null;
  durationSec: number;
  players: MatchResultPlayerInput[];
};

function computeCompetitiveDelta(won: boolean, kills: number, deaths: number, score: number): number {
  let delta = won ? WIN_POINTS : LOSS_POINTS;
  delta += kills * KILL_POINTS + deaths * DEATH_POINTS + Math.floor(score / 10);
  return delta;
}

async function findUserBySteamId(steamId: string) {
  const variants = steamIdVariants(steamId);
  return prisma.user.findFirst({
    where: { steamId: { in: variants } },
    select: { id: true, steamId: true },
  });
}

export async function processMatchResultFromGame(input: MatchResultInput): Promise<{
  ok: boolean;
  sessionId?: string;
  skipped?: boolean;
  reason?: string;
}> {
  const session = await prisma.rankedMatchSession.findFirst({
    where: {
      OR: [{ csgoMatchId: input.csgoMatchId }, { id: input.roomId }],
      status: { in: ["starting", "live", "finished"] },
    },
    select: {
      id: true,
      status: true,
      resultSyncedAt: true,
      csgoMatchId: true,
    },
  });

  if (!session) {
    return { ok: false, reason: "session_not_found" };
  }

  if (session.resultSyncedAt) {
    return { ok: true, sessionId: session.id, skipped: true, reason: "already_synced" };
  }

  const winnerTeam =
    input.winnerTeam === "A" || input.winnerTeam === "B" ? input.winnerTeam : null;

  const finishedAt = new Date();
  const liveStartedAt =
    input.durationSec > 0
      ? new Date(finishedAt.getTime() - input.durationSec * 1000)
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.rankedMatchSession.update({
      where: { id: session.id },
      data: {
        scoreTeamA: input.scoreTeamA,
        scoreTeamB: input.scoreTeamB,
        winnerTeam,
        durationSec: input.durationSec,
        liveStartedAt,
        matchFinishedAt: finishedAt,
        resultSyncedAt: finishedAt,
      },
    });

    for (const player of input.players) {
      const user = await findUserBySteamId(player.steamId);
      const won = winnerTeam != null && player.team === winnerTeam;

      await tx.rankedMatchPlayerStat.upsert({
        where: {
          sessionId_steamId: {
            sessionId: session.id,
            steamId: player.steamId,
          },
        },
        create: {
          sessionId: session.id,
          userId: user?.id ?? null,
          steamId: player.steamId,
          team: player.team,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          score: player.score,
          mvp: player.mvp,
          won,
        },
        update: {
          userId: user?.id ?? null,
          team: player.team,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          score: player.score,
          mvp: player.mvp,
          won,
        },
      });

      if (!user) continue;

      const competitiveDelta = computeCompetitiveDelta(
        won,
        player.kills,
        player.deaths,
        player.score,
      );
      const eloDelta = won ? ELO_WIN : -ELO_LOSS;

      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          rankedWins: true,
          rankedLosses: true,
          rankedKills: true,
          rankedDeaths: true,
          rankedAssists: true,
          matches: true,
          elo: true,
          kd: true,
        },
      });
      if (!current) continue;

      const rankedWins = current.rankedWins + (won ? 1 : 0);
      const rankedLosses = current.rankedLosses + (won ? 0 : 1);
      const rankedKills = current.rankedKills + player.kills;
      const rankedDeaths = current.rankedDeaths + player.deaths;
      const rankedAssists = current.rankedAssists + player.assists;
      const matches = current.matches + 1;
      const kd =
        rankedDeaths > 0
          ? Math.round((rankedKills / rankedDeaths) * 100) / 100
          : rankedKills;
      const winRate =
        rankedWins + rankedLosses > 0
          ? Math.round((rankedWins / (rankedWins + rankedLosses)) * 100)
          : 0;
      const elo = Math.max(0, current.elo + eloDelta);

      await tx.user.update({
        where: { id: user.id },
        data: {
          rankedWins,
          rankedLosses,
          rankedKills,
          rankedDeaths,
          rankedAssists,
          matches,
          kd,
          winRate,
          elo,
          competitivePoints: { increment: competitiveDelta },
        },
      });
    }
  });

  await syncLeaderboardRanks();

  if (session.status === "starting" || session.status === "live") {
    await abandonRankedSessionInternal(session.id, "finish");
  }

  afterCsgoMatchMutation();
  void notifySessionParticipants(session.id, "session");
  void notifyRankedRooms("session");
  void triggerQueueMatchmaking();

  return { ok: true, sessionId: session.id };
}
