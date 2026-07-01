import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

export type MatchDetailPlayer = {
  steamId: string;
  userId: string | null;
  nickname: string;
  displayName: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  mvp: number;
  won: boolean;
  headshots: number;
  damage: number;
  utilityDamage: number;
  enemiesFlashed: number;
  clutchesWon: number;
  entryKills: number;
  hsPct: number;
  adr: number;
  kd: number;
};

export type MatchDetailRound = {
  roundNumber: number;
  winnerTeam: string | null;
  reason: string | null;
  bombPlanted: boolean;
};

export type MatchDetailHighlight = {
  id: string;
  steamId: string;
  nickname: string;
  displayName: string;
  type: string;
  roundNumber: number | null;
  detail: string;
};

export type MatchDetailDeath = {
  roundNumber: number;
  victimSteamId: string;
  killerSteamId: string | null;
  weapon: string | null;
  headshot: boolean;
  victimTeam: string | null;
  x: number;
  y: number;
  z: number;
};

export type MatchDetail = {
  id: string;
  map: string | null;
  finishedAt: string | null;
  durationSec: number | null;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
  winnerTeam: string | null;
  totalRounds: number;
  demoUrl: string | null;
  players: MatchDetailPlayer[];
  rounds: MatchDetailRound[];
  highlights: MatchDetailHighlight[];
  deaths: MatchDetailDeath[];
};

function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function fetchMatchDetail(sessionId: string): Promise<MatchDetail | null> {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      selectedMap: true,
      matchFinishedAt: true,
      durationSec: true,
      scoreTeamA: true,
      scoreTeamB: true,
      winnerTeam: true,
      demoUrl: true,
      playerStats: {
        select: {
          steamId: true,
          userId: true,
          team: true,
          kills: true,
          deaths: true,
          assists: true,
          score: true,
          mvp: true,
          won: true,
          headshots: true,
          damage: true,
          utilityDamage: true,
          enemiesFlashed: true,
          clutchesWon: true,
          entryKills: true,
          user: { select: { ...STEAM_DISPLAY_NAME_SELECT } },
        },
        orderBy: { score: "desc" },
      },
      rounds: {
        select: {
          roundNumber: true,
          winnerTeam: true,
          reason: true,
          bombPlanted: true,
        },
        orderBy: { roundNumber: "asc" },
      },
      highlights: {
        select: {
          id: true,
          steamId: true,
          type: true,
          roundNumber: true,
          detail: true,
        },
        orderBy: { roundNumber: "asc" },
      },
      deaths: {
        select: {
          roundNumber: true,
          victimSteamId: true,
          killerSteamId: true,
          weapon: true,
          headshot: true,
          victimTeam: true,
          x: true,
          y: true,
          z: true,
        },
        orderBy: { roundNumber: "asc" },
      },
    },
  });

  if (!session) return null;

  const totalRounds = Math.max(
    0,
    (session.scoreTeamA ?? 0) + (session.scoreTeamB ?? 0),
  );

  const displayNameBySteamId = new Map<string, string>();
  for (const p of session.playerStats) {
    const fallback = `Steam ${p.steamId.slice(-6)}`;
    if (p.user) {
      displayNameBySteamId.set(p.steamId, resolveSteamDisplayName(p.user));
    } else {
      displayNameBySteamId.set(p.steamId, fallback);
    }
  }

  const players: MatchDetailPlayer[] = session.playerStats.map((p) => {
    const fallback = `Steam ${p.steamId.slice(-6)}`;
    const displayName = p.user
      ? resolveSteamDisplayName(p.user)
      : fallback;
    const totalShots = p.kills > 0 ? p.kills : 0;
    const hsPct = totalShots > 0 ? roundTo((p.headshots / totalShots) * 100, 0) : 0;
    const adr = totalRounds > 0 ? roundTo(p.damage / totalRounds, 1) : 0;
    const kd = p.deaths > 0 ? roundTo(p.kills / p.deaths, 2) : p.kills;
    return {
      steamId: p.steamId,
      userId: p.userId,
      nickname: p.user?.nickname ?? fallback,
      displayName,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      score: p.score,
      mvp: p.mvp,
      won: p.won,
      headshots: p.headshots,
      damage: p.damage,
      utilityDamage: p.utilityDamage,
      enemiesFlashed: p.enemiesFlashed,
      clutchesWon: p.clutchesWon,
      entryKills: p.entryKills,
      hsPct,
      adr,
      kd,
    };
  });

  return {
    id: session.id,
    map: session.selectedMap,
    finishedAt: session.matchFinishedAt?.toISOString() ?? null,
    durationSec: session.durationSec,
    scoreTeamA: session.scoreTeamA,
    scoreTeamB: session.scoreTeamB,
    winnerTeam: session.winnerTeam,
    totalRounds,
    demoUrl: session.demoUrl,
    players,
    rounds: session.rounds.map((r) => ({
      roundNumber: r.roundNumber,
      winnerTeam: r.winnerTeam,
      reason: r.reason,
      bombPlanted: r.bombPlanted,
    })),
    highlights: session.highlights.map((h) => ({
      id: h.id,
      steamId: h.steamId,
      nickname: displayNameBySteamId.get(h.steamId) ?? `Steam ${h.steamId.slice(-6)}`,
      displayName: displayNameBySteamId.get(h.steamId) ?? `Steam ${h.steamId.slice(-6)}`,
      type: h.type,
      roundNumber: h.roundNumber,
      detail: h.detail,
    })),
    deaths: session.deaths.map((d) => ({
      roundNumber: d.roundNumber,
      victimSteamId: d.victimSteamId,
      killerSteamId: d.killerSteamId,
      weapon: d.weapon,
      headshot: d.headshot,
      victimTeam: d.victimTeam,
      x: d.x,
      y: d.y,
      z: d.z,
    })),
  };
}
