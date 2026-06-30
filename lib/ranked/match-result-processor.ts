import "server-only";

import { prisma } from "@/lib/prisma";
import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { syncLeaderboardRanks } from "@/lib/leaderboard/sync-ranks";
import { abandonRankedSessionInternal } from "@/lib/ranked/reconcile-stale-sessions";
import { notifySessionParticipants, notifyRankedRooms } from "@/lib/realtime/notify";
import { triggerQueueMatchmaking } from "@/lib/ranked/queue-service";
import { steamIdVariants } from "@/lib/steam/steam-id";
import { grantMatchProgression, computeMatchProgression } from "@/lib/progression/award";
import { applyMissionProgress } from "@/lib/missions/service";
import { evaluateAchievements } from "@/lib/achievements/service";
import { addBattlePassXp } from "@/lib/battlepass/service";
import { mergeCountMap, mergeWeaponKills } from "@/lib/profile/player-advanced-stats";

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
  headshots?: number;
  damage?: number;
  utilityDamage?: number;
  enemiesFlashed?: number;
  clutchesWon?: number;
  entryKills?: number;
  awpKills?: number;
  weaponKills?: Record<string, number>;
};

export type MatchResultRoundInput = {
  roundNumber: number;
  winnerTeam?: string | null;
  reason?: string | null;
  bombPlanted?: boolean;
};

export type MatchResultHighlightInput = {
  steamId: string;
  type: "ACE" | "CLUTCH" | "MULTI_KILL" | "HEADSHOTS" | "ENTRY" | "KNIFE";
  roundNumber?: number;
  detail?: string;
};

export type MatchResultDeathInput = {
  roundNumber?: number;
  victimSteamId: string;
  killerSteamId?: string | null;
  weapon?: string | null;
  headshot?: boolean;
  victimTeam?: string | null;
  x?: number;
  y?: number;
  z?: number;
};

export type MatchResultInput = {
  csgoMatchId: string;
  roomId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: string | null;
  durationSec: number;
  demoUrl?: string | null;
  players: MatchResultPlayerInput[];
  rounds?: MatchResultRoundInput[];
  highlights?: MatchResultHighlightInput[];
  deaths?: MatchResultDeathInput[];
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
      selectedMap: true,
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

  const progressTargets: {
    userId: string;
    won: boolean;
    kills: number;
    assists: number;
    mvp: number;
  }[] = [];

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
        demoUrl: input.demoUrl ?? undefined,
      },
    });

    const totalRounds = Math.max(0, input.scoreTeamA) + Math.max(0, input.scoreTeamB);
    const matchMap = session.selectedMap ?? "unknown";
    const userIdBySteamId = new Map<string, string>();
    const advancedBySteamId = new Map<
      string,
      { headshots: number; clutchesWon: number; entryKills: number }
    >();

    for (const player of input.players) {
      const user = await findUserBySteamId(player.steamId);
      const won = winnerTeam != null && player.team === winnerTeam;
      const headshots = Math.max(0, player.headshots ?? 0);
      const damage = Math.max(0, player.damage ?? 0);
      const utilityDamage = Math.max(0, player.utilityDamage ?? 0);
      const enemiesFlashed = Math.max(0, player.enemiesFlashed ?? 0);
      const clutchesWon = Math.max(0, player.clutchesWon ?? 0);
      const entryKills = Math.max(0, player.entryKills ?? 0);
      const awpKills = Math.max(0, player.awpKills ?? 0);
      if (user) userIdBySteamId.set(player.steamId, user.id);
      advancedBySteamId.set(player.steamId, { headshots, clutchesWon, entryKills });

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
          headshots,
          damage,
          utilityDamage,
          enemiesFlashed,
          clutchesWon,
          entryKills,
          awpKills,
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
          headshots,
          damage,
          utilityDamage,
          enemiesFlashed,
          clutchesWon,
          entryKills,
          awpKills,
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
          mapPlayCounts: true,
          weaponKillCounts: true,
        },
      });
      if (!current) continue;

      const mapPlayCounts = mergeCountMap(current.mapPlayCounts, matchMap, 1);
      let weaponKillCounts = mergeWeaponKills(current.weaponKillCounts, player.weaponKills);
      if (awpKills > 0) {
        weaponKillCounts = mergeCountMap(weaponKillCounts, "awp", awpKills);
      }

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
          rankedMvps: { increment: player.mvp },
          rankedHeadshots: { increment: headshots },
          rankedDamage: { increment: damage },
          rankedRoundsPlayed: { increment: totalRounds },
          rankedClutches: { increment: clutchesWon },
          rankedUtilityDamage: { increment: utilityDamage },
          rankedEnemiesFlashed: { increment: enemiesFlashed },
          rankedAwpKills: { increment: awpKills },
          mapPlayCounts,
          weaponKillCounts,
          matches,
          kd,
          winRate,
          elo,
          competitivePoints: { increment: competitiveDelta },
        },
      });

      await grantMatchProgression(tx, user.id, {
        won,
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        score: player.score,
        mvp: player.mvp,
      });

      progressTargets.push({
        userId: user.id,
        won,
        kills: player.kills,
        assists: player.assists,
        mvp: player.mvp,
      });
    }

    // Round timeline (optional).
    if (input.rounds && input.rounds.length > 0) {
      await tx.rankedMatchRound.createMany({
        data: input.rounds.map((round) => ({
          sessionId: session.id,
          roundNumber: round.roundNumber,
          winnerTeam: round.winnerTeam ?? null,
          reason: round.reason ?? null,
          bombPlanted: round.bombPlanted ?? false,
        })),
        skipDuplicates: true,
      });
    }

    // Death heatmap data (optional).
    if (input.deaths && input.deaths.length > 0) {
      await tx.rankedMatchDeath.createMany({
        data: input.deaths.map((death) => ({
          sessionId: session.id,
          roundNumber: death.roundNumber ?? 0,
          victimSteamId: death.victimSteamId,
          killerSteamId: death.killerSteamId ?? null,
          weapon: death.weapon ?? null,
          headshot: death.headshot ?? false,
          victimTeam: death.victimTeam ?? null,
          x: death.x ?? 0,
          y: death.y ?? 0,
          z: death.z ?? 0,
        })),
      });
    }

    // Highlights: use explicit payload, otherwise derive from advanced stats.
    const highlightRows: {
      sessionId: string;
      steamId: string;
      userId: string | null;
      type: "ACE" | "CLUTCH" | "MULTI_KILL" | "HEADSHOTS" | "ENTRY" | "KNIFE";
      roundNumber: number | null;
      detail: string;
    }[] = [];

    if (input.highlights && input.highlights.length > 0) {
      for (const hl of input.highlights) {
        highlightRows.push({
          sessionId: session.id,
          steamId: hl.steamId,
          userId: userIdBySteamId.get(hl.steamId) ?? null,
          type: hl.type,
          roundNumber: hl.roundNumber ?? null,
          detail: hl.detail ?? "",
        });
      }
    } else {
      for (const [steamId, adv] of advancedBySteamId) {
        if (adv.clutchesWon > 0) {
          highlightRows.push({
            sessionId: session.id,
            steamId,
            userId: userIdBySteamId.get(steamId) ?? null,
            type: "CLUTCH",
            roundNumber: null,
            detail: `${adv.clutchesWon} clutch(es)`,
          });
        }
        if (adv.entryKills >= 3) {
          highlightRows.push({
            sessionId: session.id,
            steamId,
            userId: userIdBySteamId.get(steamId) ?? null,
            type: "ENTRY",
            roundNumber: null,
            detail: `${adv.entryKills} entry kills`,
          });
        }
        if (adv.headshots >= 10) {
          highlightRows.push({
            sessionId: session.id,
            steamId,
            userId: userIdBySteamId.get(steamId) ?? null,
            type: "HEADSHOTS",
            roundNumber: null,
            detail: `${adv.headshots} headshots`,
          });
        }
      }
    }

    if (highlightRows.length > 0) {
      await tx.rankedMatchHighlight.createMany({ data: highlightRows });
    }
  });

  // Missions + achievements run outside the match transaction (best-effort).
  for (const target of progressTargets) {
    try {
      await applyMissionProgress(target.userId, {
        MATCHES_PLAYED: 1,
        MATCHES_WON: target.won ? 1 : 0,
        KILLS: target.kills,
        ASSISTS: target.assists,
        MVPS: target.mvp,
      });
      await evaluateAchievements(target.userId);
      const bpXp = computeMatchProgression({
        won: target.won,
        kills: target.kills,
        deaths: 0,
        assists: target.assists,
        score: 0,
        mvp: target.mvp,
      }).xp;
      await addBattlePassXp(target.userId, bpXp);
    } catch (err) {
      console.error("[match-result] progression post-processing failed", err);
    }
  }

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
