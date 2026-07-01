import "server-only";

import { prisma } from "@/lib/prisma";
import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { syncLeaderboardRanks } from "@/lib/leaderboard/sync-ranks";
import { notifyRankedRooms, notifySessionParticipants } from "@/lib/realtime/notify";

const WIN_POINTS = 100;
const LOSS_POINTS = -15;
const KILL_POINTS = 2;
const DEATH_POINTS = -1;
const ELO_WIN = 25;
const ELO_LOSS = 20;

function computeCompetitiveDelta(won: boolean, kills: number, deaths: number, score: number): number {
  let delta = won ? WIN_POINTS : LOSS_POINTS;
  delta += kills * KILL_POINTS + deaths * DEATH_POINTS + Math.floor(score / 10);
  return delta;
}

function decrementCountMap(existing: unknown, key: string, delta: number): Record<string, number> {
  const map: Record<string, number> =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, number>) }
      : {};
  if (!key.trim() || delta <= 0) return map;
  const next = Math.max(0, (map[key] ?? 0) - delta);
  if (next === 0) delete map[key];
  else map[key] = next;
  return map;
}

function decrementWeaponKills(
  existing: unknown,
  weaponKills: Record<string, number> | undefined,
): Record<string, number> {
  const map: Record<string, number> =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, number>) }
      : {};
  if (!weaponKills) return map;
  for (const [weapon, kills] of Object.entries(weaponKills)) {
    const k = weapon.trim().toLowerCase();
    const n = Math.max(0, Math.floor(kills));
    if (!k || n <= 0) continue;
    const next = Math.max(0, (map[k] ?? 0) - n);
    if (next === 0) delete map[k];
    else map[k] = next;
  }
  return map;
}

/** Cancela sessão já finalizada e estorna ELO/pontos/stats aplicados pelo resultado. */
export async function voidFinishedRankedSession(sessionId: string): Promise<{
  ok: boolean;
  message: string;
  playersReversed?: number;
}> {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      resultSyncedAt: true,
      selectedMap: true,
      seasonId: true,
      scoreTeamA: true,
      scoreTeamB: true,
    },
  });

  if (!session) {
    return { ok: false, message: "Sessão não encontrada." };
  }

  if (session.status !== "finished" || !session.resultSyncedAt) {
    return {
      ok: false,
      message: "Só é possível anular partidas finalizadas com resultado sincronizado.",
    };
  }

  const playerStats = await prisma.rankedMatchPlayerStat.findMany({
    where: { sessionId: session.id },
  });

  if (playerStats.length === 0) {
    return { ok: false, message: "Partida sem estatísticas — nada a estornar." };
  }

  const totalRounds =
    Math.max(0, session.scoreTeamA ?? 0) + Math.max(0, session.scoreTeamB ?? 0);
  const matchMap = session.selectedMap ?? "unknown";
  let playersReversed = 0;

  await prisma.$transaction(async (tx) => {
    for (const stat of playerStats) {
      if (!stat.userId) continue;

      const current = await tx.user.findUnique({
        where: { id: stat.userId },
        select: {
          rankedWins: true,
          rankedLosses: true,
          rankedKills: true,
          rankedDeaths: true,
          rankedAssists: true,
          rankedMvps: true,
          rankedHeadshots: true,
          rankedDamage: true,
          rankedRoundsPlayed: true,
          rankedClutches: true,
          rankedUtilityDamage: true,
          rankedEnemiesFlashed: true,
          rankedAwpKills: true,
          matches: true,
          elo: true,
          competitivePoints: true,
          mapPlayCounts: true,
          weaponKillCounts: true,
        },
      });
      if (!current) continue;

      const won = stat.won;
      const rankedWins = Math.max(0, current.rankedWins - (won ? 1 : 0));
      const rankedLosses = Math.max(0, current.rankedLosses - (won ? 0 : 1));
      const rankedKills = Math.max(0, current.rankedKills - stat.kills);
      const rankedDeaths = Math.max(0, current.rankedDeaths - stat.deaths);
      const rankedAssists = Math.max(0, current.rankedAssists - stat.assists);
      const matches = Math.max(0, current.matches - 1);
      const kd =
        rankedDeaths > 0
          ? Math.round((rankedKills / rankedDeaths) * 100) / 100
          : rankedKills;
      const winRate =
        rankedWins + rankedLosses > 0
          ? Math.round((rankedWins / (rankedWins + rankedLosses)) * 100)
          : 0;

      let mapPlayCounts = decrementCountMap(current.mapPlayCounts, matchMap, 1);
      let weaponKillCounts = decrementWeaponKills(current.weaponKillCounts, undefined);
      if (stat.awpKills > 0) {
        weaponKillCounts = decrementCountMap(weaponKillCounts, "awp", stat.awpKills);
      }

      let elo = Math.max(0, current.elo + (won ? -ELO_WIN : ELO_LOSS));
      let competitivePoints = Math.max(
        0,
        current.competitivePoints -
          computeCompetitiveDelta(won, stat.kills, stat.deaths, stat.score),
      );

      if (session.seasonId && rankedWins + rankedLosses === 0) {
        const placement = await tx.userRankedSeasonPlacement.findUnique({
          where: { userId_seasonId: { userId: stat.userId, seasonId: session.seasonId } },
        });
        if (placement?.placementApplied) {
          await tx.userRankedSeasonPlacement.update({
            where: { id: placement.id },
            data: {
              placementApplied: false,
              seededElo: null,
              seededPoints: null,
            },
          });
          elo = 1000;
          competitivePoints = 0;
        }
      }

      await tx.user.update({
        where: { id: stat.userId },
        data: {
          rankedWins,
          rankedLosses,
          rankedKills,
          rankedDeaths,
          rankedAssists,
          rankedMvps: { decrement: stat.mvp },
          rankedHeadshots: { decrement: stat.headshots },
          rankedDamage: { decrement: stat.damage },
          rankedRoundsPlayed: { decrement: totalRounds },
          rankedClutches: { decrement: stat.clutchesWon },
          rankedUtilityDamage: { decrement: stat.utilityDamage },
          rankedEnemiesFlashed: { decrement: stat.enemiesFlashed },
          rankedAwpKills: { decrement: stat.awpKills },
          mapPlayCounts,
          weaponKillCounts,
          matches,
          kd,
          winRate,
          elo,
          competitivePoints,
        },
      });

      playersReversed += 1;
    }

    await tx.rankedMatchHighlight.deleteMany({ where: { sessionId: session.id } });
    await tx.rankedMatchDeath.deleteMany({ where: { sessionId: session.id } });
    await tx.rankedMatchRound.deleteMany({ where: { sessionId: session.id } });
    await tx.rankedMatchPlayerStat.deleteMany({ where: { sessionId: session.id } });

    await tx.rankedMatchSession.update({
      where: { id: session.id },
      data: {
        status: "cancelled",
        resultSyncedAt: null,
        winnerTeam: null,
        scoreTeamA: null,
        scoreTeamB: null,
        durationSec: null,
        matchFinishedAt: null,
      },
    });
  });

  await syncLeaderboardRanks();
  afterCsgoMatchMutation();
  void notifySessionParticipants(sessionId, "session");
  void notifyRankedRooms("session");

  return {
    ok: true,
    message: `Partida anulada. Pontos estornados para ${playersReversed} jogador(es).`,
    playersReversed,
  };
}
