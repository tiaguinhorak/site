import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveRankedMatchSeasonId } from "@/lib/ranked/season-match";
import { cancelCsgoMatchIfActive, cancelCsgoMatchesForRoom } from "@/lib/csgo-api/cancel-stale-matches";
import { completeCsgoVetoForMap } from "@/lib/csgo-api/complete-veto-for-map";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import {
  attemptCsgoMatchStart,
  clearMatchServerBootstrap,
  ensureCsgoServerAvailableForMatch,
} from "@/lib/csgo-api/ensure-match-server";
import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { resolveRankedConnect } from "@/lib/csgo-api/resolve-ranked-connect";
import { queryCsgoServerLive } from "@/lib/csgo-api/query-live-server";
import {
  RANKED_MAP_POOL,
  RANKED_MATCH_CONFIG,
  RANKED_VOTE_SECONDS,
} from "@/lib/ranked/constants";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";
import {
  notifyRankedServerLive,
  notifyRankedVoteStarted,
} from "@/lib/ranked/notifications";
import { notifySessionParticipants, notifyRankedRooms } from "@/lib/realtime/notify";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";
import { reconcileRankedSessionConnect } from "@/lib/ranked/reconcile-server-state";
import {
  abandonRankedSessionInternal,
  reconcileStaleSessionsForUser,
} from "@/lib/ranked/reconcile-stale-sessions";
import { formatConnectAddress, formatConnectCommand } from "@/lib/servers/connect";
import type { CsgoMatchLiveView } from "@/lib/csgo-api/match-live";
import {
  RankedPartyError,
  partyInclude,
  parsePartyMapPool,
  serializeParty,
} from "@/lib/ranked/party-service";
import {
  markPartiesInMatch,
  releaseLobbyRoomAfterMatch,
  resetPartiesAfterSession,
} from "@/lib/ranked/party-lifecycle";
import type {
  RankedMapVoteStateView,
  RankedMatchSessionView,
} from "@/lib/ranked/party-shared";

const sessionInclude = {
  partyA: { include: partyInclude },
  partyB: { include: partyInclude },
  acceptances: {
    include: {
      user: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } },
    },
  },
  mapVotes: true,
  challenge: true,
};

const LAUNCHABLE_SESSION_STATUSES = ["starting", "live"] as const;

type SessionWithRelations = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.rankedMatchSession.findFirst<{
        include: typeof sessionInclude;
      }>
    >
  >
>;

function getUserTeam(
  session: SessionWithRelations,
  userId: string,
): "A" | "B" | null {
  const inA = session.partyA.members.some((m) => m.userId === userId);
  if (inA) return "A";
  const inB = session.partyB.members.some((m) => m.userId === userId);
  if (inB) return "B";
  return null;
}

function getSessionPlayerIds(session: SessionWithRelations): string[] {
  return [...session.partyA.members, ...session.partyB.members].map((m) => m.userId);
}

function isBotEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.includes("ranked-bot-") || email.endsWith("@test.clutchclube.com");
}

export function serializeSession(
  session: SessionWithRelations,
  viewerUserId?: string,
  live?: CsgoMatchLiveView | null,
): RankedMatchSessionView {
  const teamSize = session.teamSize ?? 5;
  const partyA = serializeParty(session.partyA, viewerUserId, teamSize);
  const partyB = serializeParty(session.partyB, viewerUserId, teamSize);
  const allMembers = [...session.partyA.members, ...session.partyB.members];
  const requiredCount = allMembers.length;
  const acceptances = allMembers.map((m) => {
    const row = session.acceptances.find((a) => a.userId === m.userId);
    return {
      userId: m.userId,
      nickname: m.user.nickname,
      displayName: resolveSteamDisplayName(m.user),
      accepted: row?.accepted ?? false,
      isYou: viewerUserId === m.userId,
    };
  });
  const acceptedCount = acceptances.filter((a) => a.accepted).length;
  const yourTeam = viewerUserId ? getUserTeam(session, viewerUserId) : null;
  const isCaptain =
    viewerUserId != null &&
    (session.partyA.leaderUserId === viewerUserId ||
      session.partyB.leaderUserId === viewerUserId);

  return {
    id: session.id,
    status: session.status as RankedMatchSessionView["status"],
    matchSource: (session.matchSource ?? "challenge") as RankedMatchSessionView["matchSource"],
    teamSize,
    lobbyRoomId: session.lobbyRoomId ?? null,
    csgoMatchId: session.csgoMatchId,
    selectedMap: session.selectedMap,
    serverHost: session.serverHost,
    serverPort: session.serverPort,
    connectAddress: formatConnectAddress(session.serverHost, session.serverPort),
    connectCommand: formatConnectCommand(session.serverHost, session.serverPort),
    partyA,
    partyB,
    acceptances,
    acceptedCount,
    requiredCount,
    youAccepted: acceptances.find((a) => a.isYou)?.accepted ?? false,
    yourTeam,
    isCaptain,
    scoreTeamA: session.scoreTeamA ?? live?.scoreTeamA ?? null,
    scoreTeamB: session.scoreTeamB ?? live?.scoreTeamB ?? null,
    winnerTeam: session.winnerTeam ?? live?.winner ?? null,
    livePhase: live?.phase ?? null,
    liveRound: live?.round ?? null,
  };
}

function getSessionMapPool(session: SessionWithRelations): string[] {
  const poolA = parsePartyMapPool(session.partyA.mapPool);
  const poolB = parsePartyMapPool(session.partyB.mapPool);
  const intersection = poolA.filter((m) => poolB.includes(m));
  if (intersection.length >= 3) return intersection;
  const union = [...new Set([...poolA, ...poolB])];
  if (union.length >= 3) return union;
  return [...RANKED_MAP_POOL];
}

function buildVoteState(
  session: SessionWithRelations,
  viewerUserId?: string,
): RankedMapVoteStateView {
  const requiredCount = session.partyA.members.length + session.partyB.members.length;
  const mapPool = getSessionMapPool(session);
  const counts = new Map<string, string[]>();
  for (const map of mapPool) counts.set(map, []);
  for (const vote of session.mapVotes) {
    const list = counts.get(vote.map);
    if (list) list.push(vote.userId);
  }

  const yourVote = viewerUserId
    ? (session.mapVotes.find((v) => v.userId === viewerUserId)?.map ?? null)
    : null;

  const options = [...counts.entries()]
    .map(([map, voters]) => ({
      map,
      votes: voters.length,
      voters,
      isYourVote: yourVote === map,
    }))
    .sort((a, b) => b.votes - a.votes || a.map.localeCompare(b.map));

  const totalVotes = session.mapVotes.length;
  const secondsLeft = session.voteEndsAt
    ? Math.max(0, Math.ceil((session.voteEndsAt.getTime() - Date.now()) / 1000))
    : RANKED_VOTE_SECONDS;

  return {
    options,
    yourVote,
    totalVotes,
    requiredCount,
    votedCount: totalVotes,
    secondsLeft,
    endsAt: session.voteEndsAt?.toISOString() ?? null,
    isComplete: session.selectedMap != null,
    selectedMap: session.selectedMap,
  };
}

function pickWinningMap(session: SessionWithRelations): string {
  const mapPool = getSessionMapPool(session);
  const counts = new Map<string, number>();
  for (const map of mapPool) counts.set(map, 0);
  for (const vote of session.mapVotes) {
    if (counts.has(vote.map)) {
      counts.set(vote.map, (counts.get(vote.map) ?? 0) + 1);
    }
  }

  let max = 0;
  for (const value of counts.values()) max = Math.max(max, value);

  const top =
    max === 0
      ? [...mapPool]
      : [...counts.entries()].filter(([, v]) => v === max).map(([map]) => map);

  return top[Math.floor(Math.random() * top.length)] ?? mapPool[0]!;
}

async function reloadSession(sessionId: string): Promise<SessionWithRelations> {
  return prisma.rankedMatchSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: sessionInclude,
  });
}

async function autoVoteBots(session: SessionWithRelations): Promise<boolean> {
  const playerIds = getSessionPlayerIds(session);
  const alreadyVoted = new Set(session.mapVotes.map((v) => v.userId));
  const missing = playerIds.filter((id) => !alreadyVoted.has(id));
  if (!missing.length) return false;

  const users = await prisma.user.findMany({
    where: { id: { in: missing } },
    select: { id: true, email: true },
  });
  const bots = users.filter((u) => isBotEmail(u.email));
  if (!bots.length) return false;

  const mapPool = getSessionMapPool(session);
  await prisma.rankedMapVote.createMany({
    data: bots.map((bot) => ({
      sessionId: session.id,
      userId: bot.id,
      map: mapPool[Math.floor(Math.random() * mapPool.length)]!,
    })),
    skipDuplicates: true,
  });
  return true;
}

async function createCsgoMatchRecord(sessionId: string): Promise<string | null> {
  const existing = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: { csgoMatchId: true, status: true },
  });
  if (!existing || existing.status === "cancelled" || existing.status === "finished") {
    return null;
  }
  if (existing.csgoMatchId) return existing.csgoMatchId;

  await cancelCsgoMatchesForRoom(sessionId);

  const session = await prisma.rankedMatchSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (session.csgoMatchId) return session.csgoMatchId;

  const teamA = await buildTeamPayload(session.partyAId);
  const teamB = await buildTeamPayload(session.partyBId);
  const mapPool = getSessionMapPool(session);

  const match = await csgoBackendFetch<{ id: string }>("/api/matches", {
    method: "POST",
    body: {
      roomId: sessionId,
      teamA,
      teamB,
      mapPool,
      config: RANKED_MATCH_CONFIG,
    },
  });

  const claimed = await prisma.rankedMatchSession.updateMany({
    where: { id: sessionId, csgoMatchId: null, status: { notIn: ["cancelled", "finished"] } },
    data: { csgoMatchId: match.id },
  });

  if (claimed.count === 0) {
    await cancelCsgoMatchIfActive(match.id);
    const current = await prisma.rankedMatchSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { csgoMatchId: true, status: true },
    });
    if (current.status === "cancelled" || current.status === "finished") return null;
    return current.csgoMatchId;
  }

  return match.id;
}

async function buildTeamPayload(partyId: string) {
  const party = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: partyId },
    include: {
      leader: { select: { nickname: true } },
      members: {
        orderBy: { slotIndex: "asc" },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              steamId: true,
              steamPersonaName: true,
            },
          },
        },
      },
    },
  });

  return {
    name: party.leader.nickname,
    players: party.members.map((m) => ({
      steamId: m.user.steamId ?? m.user.id,
      name: m.user.steamPersonaName ?? m.user.nickname,
    })),
  };
}

async function applyConnectToSession(
  sessionId: string,
  csgoMatchId: string | null,
  selectedMap: string | null,
) {
  const connect = await resolveRankedConnect(csgoMatchId);

  let serverHost = connect.serverHost;
  let serverPort = connect.serverPort;
  let online = connect.matchStatus === "live";

  if (serverHost && serverPort) {
    const live = await queryCsgoServerLive(serverHost, serverPort);
    online = live.online || connect.matchStatus === "live";
    if (!online) {
      serverHost = null;
      serverPort = null;
    }
  }

  const isLive = online && serverHost != null && serverPort != null;

  await prisma.rankedMatchSession.updateMany({
    where: {
      id: sessionId,
      status: { in: [...LAUNCHABLE_SESSION_STATUSES] },
    },
    data: {
      status: isLive ? "live" : "starting",
      selectedMap: selectedMap ?? connect.selectedMap,
      serverHost,
      serverPort,
      csgoServerId: connect.csgoServerId,
    },
  });

  return prisma.rankedMatchSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: sessionInclude,
  });
}

/** Conclui o veto na API CS:GO com o mapa eleito na votação do site. */
async function syncSelectedMapToCsgoApi(
  csgoMatchId: string,
  map: string,
): Promise<string | null> {
  try {
    await completeCsgoVetoForMap(csgoMatchId, map);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Falha ao sincronizar mapa com a API CS:GO.";
  }
}

/**
 * Sobe o servidor para o mapa vencedor e resolve o connect.
 * Idempotente: pode ser chamado por vários pollers enquanto o servidor sobe.
 */
async function launchServerForMap(
  sessionId: string,
  selectedMap: string,
): Promise<string | null> {
  const current = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });
  if (!current || current.status === "cancelled" || current.status === "finished") {
    return null;
  }
  if (current.status !== "starting" && current.status !== "live") {
    return null;
  }

  let launchMessage: string | null = null;

  const csgoMatchId = await createCsgoMatchRecord(sessionId);
  if (!csgoMatchId) return null;

  const vetoError = await syncSelectedMapToCsgoApi(csgoMatchId, selectedMap);
  if (vetoError) launchMessage = vetoError;

  const ensured = await ensureCsgoServerAvailableForMatch(sessionId, selectedMap);
  if (!ensured.ok) launchMessage = ensured.message;

  const startError = await attemptCsgoMatchStart(csgoMatchId, sessionId);
  if (startError) launchMessage = startError;

  const prior = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: { serverHost: true },
  });

  const updated = await applyConnectToSession(sessionId, csgoMatchId, selectedMap);

  if (updated.serverHost && updated.serverPort && !prior?.serverHost) {
    clearMatchServerBootstrap(sessionId);
    void notifySessionParticipants(sessionId, "session");
    await notifyRankedServerLive(
      getSessionPlayerIds(updated),
      selectedMap,
      updated.serverHost,
      updated.serverPort,
    );
    return null;
  }

  if (updated.serverHost && updated.serverPort) {
    clearMatchServerBootstrap(sessionId);
    return null;
  }

  return (
    launchMessage ??
    "Servidor subindo. Aguarde — ou suba manualmente em Admin → Infra CS:GO."
  );
}

/**
 * Fecha a votação: reivindica a sessão (voting → starting) de forma atômica para
 * evitar corrida entre pollers, grava o mapa vencedor e sobe o servidor.
 */
async function finalizeVote(session: SessionWithRelations): Promise<string | null> {
  const winner = pickWinningMap(session);

  const claimed = await prisma.rankedMatchSession.updateMany({
    where: { id: session.id, status: "voting" },
    data: { status: "starting", selectedMap: winner },
  });
  if (claimed.count > 0) {
    void notifySessionParticipants(session.id, "session");
  }

  const current = await prisma.rankedMatchSession.findUniqueOrThrow({
    where: { id: session.id },
    select: { selectedMap: true, status: true },
  });
  if (current.status === "cancelled" || current.status === "finished") return null;

  const selectedMap = current.selectedMap ?? winner;
  return launchServerForMap(session.id, selectedMap);
}

export async function createMatchSessionFromChallenge(challengeId: string) {
  const challenge = await prisma.rankedChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!challenge || challenge.status !== "accepted") {
    throw new RankedPartyError("invalidChallenge", 400);
  }

  const existing = await prisma.rankedMatchSession.findUnique({
    where: { challengeId },
    include: sessionInclude,
  });
  if (existing) return serializeSession(existing);

  const partyA = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: challenge.fromPartyId },
    include: { members: true },
  });
  const partyB = await prisma.rankedParty.findUniqueOrThrow({
    where: { id: challenge.toPartyId },
    include: { members: true },
  });

  const allUserIds = [...partyA.members, ...partyB.members].map((m) => m.userId);
  const seasonId = await resolveRankedMatchSeasonId();

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.rankedMatchSession.create({
      data: {
        challengeId,
        partyAId: challenge.fromPartyId,
        partyBId: challenge.toPartyId,
        seasonId,
        status: "voting",
        voteEndsAt: new Date(Date.now() + RANKED_VOTE_SECONDS * 1000),
      },
    });

    await tx.rankedMatchAcceptance.createMany({
      data: allUserIds.map((userId) => ({
        sessionId: created.id,
        userId,
        accepted: true,
        acceptedAt: new Date(),
      })),
    });

    // O líder pode disparar vários desafios; ao confirmar um, os demais pendentes
    // que envolvem qualquer um dos dois lobbies são cancelados.
    await tx.rankedChallenge.updateMany({
      where: {
        status: "pending",
        id: { not: challengeId },
        OR: [
          { fromPartyId: challenge.fromPartyId },
          { toPartyId: challenge.fromPartyId },
          { fromPartyId: challenge.toPartyId },
          { toPartyId: challenge.toPartyId },
        ],
      },
      data: { status: "cancelled", respondedAt: new Date() },
    });

    return tx.rankedMatchSession.findUniqueOrThrow({
      where: { id: created.id },
      include: sessionInclude,
    });
  });

  await notifyRankedVoteStarted(allUserIds);
  void notifySessionParticipants(session.id, "session");
  void notifyRankedRooms("session");
  return serializeSession(session);
}

export async function getActiveSessionForUser(userId: string) {
  await reconcileStaleSessionsForUser(userId);

  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!membership) return null;

  const session = await prisma.rankedMatchSession.findFirst({
    where: {
      status: { in: ["accepting", "voting", "starting", "live"] },
      OR: [{ partyAId: membership.partyId }, { partyBId: membership.partyId }],
    },
    include: sessionInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!session) return null;
  const staleConnect = await reconcileRankedSessionConnect(session.id);
  const sessionRow = staleConnect
    ? await prisma.rankedMatchSession.findFirstOrThrow({
        where: { id: session.id },
        include: sessionInclude,
      })
    : session;
  const hydrated = await hydrateSessionConnect(sessionRow);
  return serializeSession(hydrated, userId);
}

async function hydrateSessionConnect(session: SessionWithRelations) {
  if (session.serverHost && session.serverPort) {
    const live = await queryCsgoServerLive(session.serverHost, session.serverPort);
    if (!live.online && session.status === "live") {
      await prisma.rankedMatchSession.updateMany({
        where: { id: session.id, status: { in: [...LAUNCHABLE_SESSION_STATUSES] } },
        data: { status: "starting", serverHost: null, serverPort: null },
      });
      return prisma.rankedMatchSession.findUniqueOrThrow({
        where: { id: session.id },
        include: sessionInclude,
      });
    }
    return session;
  }
  if (!["live", "starting"].includes(session.status)) return session;

  try {
    const connect = await resolveRankedConnect(session.csgoMatchId);
    if (!connect.serverHost || !connect.serverPort) return session;

    const live = await queryCsgoServerLive(connect.serverHost, connect.serverPort);
    if (!live.online && connect.matchStatus !== "live") return session;

    await prisma.rankedMatchSession.updateMany({
      where: {
        id: session.id,
        status: { in: [...LAUNCHABLE_SESSION_STATUSES] },
      },
      data: {
        serverHost: connect.serverHost,
        serverPort: connect.serverPort,
        selectedMap: connect.selectedMap ?? session.selectedMap,
        status: "live",
      },
    });

    return prisma.rankedMatchSession.findUniqueOrThrow({
      where: { id: session.id },
      include: sessionInclude,
    });
  } catch {
    return session;
  }
}

export async function acceptMatchSession(userId: string, sessionId: string) {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) throw new RankedPartyError("sessionNotFound", 404);
  if (session.status !== "accepting") {
    throw new RankedPartyError("matchNotAwaitingAccept", 400);
  }

  const team = getUserTeam(session, userId);
  if (!team) throw new RankedPartyError("notInMatch", 403);

  await prisma.rankedMatchAcceptance.update({
    where: { sessionId_userId: { sessionId, userId } },
    data: { accepted: true, acceptedAt: new Date() },
  });

  const refreshed = await reloadSession(sessionId);
  const allAccepted = refreshed.acceptances.every((a) => a.accepted);

  if (allAccepted && refreshed.status === "accepting") {
    const claimed = await prisma.rankedMatchSession.updateMany({
      where: { id: sessionId, status: "accepting" },
      data: {
        status: "voting",
        voteEndsAt: new Date(Date.now() + RANKED_VOTE_SECONDS * 1000),
      },
    });
    if (claimed.count > 0) {
      await notifyRankedVoteStarted(getSessionPlayerIds(refreshed));
      void notifySessionParticipants(sessionId, "session");
    }
    return serializeSession(await reloadSession(sessionId), userId);
  }

  void notifySessionParticipants(sessionId, "session");
  return serializeSession(refreshed, userId);
}

export async function getMapVoteStateForUser(userId: string, sessionId: string) {
  let session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) throw new RankedPartyError("sessionNotFound", 404);

  if (session.status === "cancelled" || session.status === "finished") {
    return {
      session: serializeSession(session, userId),
      vote: null,
      launchMessage: null,
    };
  }

  let launchMessage: string | null = null;

  if (session.status === "voting") {
    const botsVoted = await autoVoteBots(session);
    if (botsVoted) session = await reloadSession(sessionId);

    const everyoneVoted = session.mapVotes.length >= getSessionPlayerIds(session).length;
    const timeUp = session.voteEndsAt != null && session.voteEndsAt.getTime() <= Date.now();

    if (everyoneVoted || timeUp) {
      launchMessage = await finalizeVote(session);
      session = await reloadSession(sessionId);
    }
  }

  // Servidor ainda subindo após a votação: continua tentando a cada poll.
  if (
    session.status === "starting" &&
    session.selectedMap &&
    (!session.serverHost || !session.serverPort)
  ) {
    launchMessage = await launchServerForMap(sessionId, session.selectedMap);
    session = await reloadSession(sessionId);
  }

  session = await hydrateSessionConnect(session);

  if (
    session.status === "live" &&
    session.serverHost &&
    session.serverPort &&
    (await reconcileRankedSessionConnect(sessionId))
  ) {
    session = await reloadSession(sessionId);
    launchMessage = "Servidor offline. Aguardando novo connect…";
  }

  return {
    session: serializeSession(session, userId),
    vote: buildVoteState(session, userId),
    launchMessage,
  };
}

export async function castMapVote(userId: string, sessionId: string, map: string) {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) throw new RankedPartyError("sessionNotFound", 404);
  if (session.status !== "voting") {
    throw new RankedPartyError("mapVoteNotActive", 400);
  }
  if (!getUserTeam(session, userId)) {
    throw new RankedPartyError("notInMatch", 403);
  }
  const allowedMaps = getSessionMapPool(session);
  if (!allowedMaps.includes(map)) {
    throw new RankedPartyError("invalidMapForMatch", 400);
  }
  if (session.voteEndsAt && session.voteEndsAt.getTime() <= Date.now()) {
    throw new RankedPartyError("voteTimeEnded", 409);
  }

  await prisma.rankedMapVote.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, map },
    update: { map },
  });

  void notifySessionParticipants(sessionId, "session");
  return getMapVoteStateForUser(userId, sessionId);
}

export async function recordMatchDodge(userId: string, sessionId: string) {
  const acceptance = await prisma.rankedMatchAcceptance.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!acceptance || acceptance.accepted) return;

  const { applyRankedQueueDodge } = await import("@/lib/ranked/queue-restriction");
  await applyRankedQueueDodge(userId, "timeout");
}

export async function cancelRankedMatchSession(userId: string, sessionId: string) {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) throw new RankedPartyError("sessionNotFound", 404);
  if (!getUserTeam(session, userId)) {
    throw new RankedPartyError("notInMatch", 403);
  }
  if (!["accepting", "voting", "starting"].includes(session.status)) {
    throw new RankedPartyError("matchCannotCancelNow", 400);
  }

  clearMatchServerBootstrap(sessionId);

  const cancelled = await prisma.rankedMatchSession.updateMany({
    where: {
      id: sessionId,
      status: { in: ["accepting", "voting", "starting"] },
    },
    data: { status: "cancelled" },
  });
  if (cancelled.count === 0) {
    throw new RankedPartyError("matchAlreadyEnded", 409);
  }

  if (session.csgoMatchId) {
    await cancelCsgoMatchIfActive(session.csgoMatchId);
  }
  await cancelCsgoMatchesForRoom(sessionId, session.csgoMatchId);
  afterCsgoMatchMutation();

  await resetPartiesAfterSession(session.partyAId, session.partyBId, session.teamSize);
  await releaseLobbyRoomAfterMatch(session.lobbyRoomId);

  void notifySessionParticipants(sessionId, "session");
  void notifyRankedRooms("session");
  return { ok: true as const };
}

export async function finishRankedMatchSession(userId: string, sessionId: string) {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) throw new RankedPartyError("sessionNotFound", 404);
  if (!getUserTeam(session, userId)) {
    throw new RankedPartyError("notInMatch", 403);
  }
  if (!["live", "starting"].includes(session.status)) {
    throw new RankedPartyError("onlyEndLiveMatches", 400);
  }

  clearMatchServerBootstrap(sessionId);

  const finished = await prisma.rankedMatchSession.updateMany({
    where: { id: sessionId, status: { in: ["live", "starting"] } },
    data: { status: "finished" },
  });
  if (finished.count === 0) {
    throw new RankedPartyError("matchAlreadyEnded", 409);
  }

  if (session.csgoMatchId) {
    try {
      await csgoBackendFetch(`/api/matches/${session.csgoMatchId}/end`, { method: "POST" });
    } catch {
      /* API externa opcional */
    }
  }

  await resetPartiesAfterSession(session.partyAId, session.partyBId, session.teamSize);
  await releaseLobbyRoomAfterMatch(session.lobbyRoomId);
  afterCsgoMatchMutation();

  void notifySessionParticipants(sessionId, "session");
  void notifyRankedRooms("session");
  return serializeSession(await reloadSession(sessionId), userId);
}

export async function getPostMatchSessionForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!membership) return null;

  const session = await prisma.rankedMatchSession.findFirst({
    where: {
      status: "finished",
      OR: [{ partyAId: membership.partyId }, { partyBId: membership.partyId }],
    },
    include: sessionInclude,
    orderBy: { updatedAt: "desc" },
  });

  if (!session) return null;
  return serializeSession(session, userId);
}

export async function rematchRankedSession(userId: string, sessionId: string) {
  const prev = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!prev) throw new RankedPartyError("sessionNotFound", 404);
  if (prev.status !== "finished") {
    throw new RankedPartyError("rematchAfterPreviousEnd", 400);
  }
  if (!getUserTeam(prev, userId)) {
    throw new RankedPartyError("notInRoom", 403);
  }

  const active = await prisma.rankedMatchSession.findFirst({
    where: {
      status: { in: ["accepting", "voting", "starting", "live"] },
      OR: [{ partyAId: prev.partyAId }, { partyBId: prev.partyBId }],
    },
  });
  if (active) {
    throw new RankedPartyError("activeMatchInRoom", 409);
  }

  const playerIds = getSessionPlayerIds(prev);
  const seasonId = prev.seasonId ?? (await resolveRankedMatchSeasonId());
  const next = await prisma.$transaction(async (tx) => {
    const created = await tx.rankedMatchSession.create({
      data: {
        partyAId: prev.partyAId,
        partyBId: prev.partyBId,
        lobbyRoomId: prev.lobbyRoomId,
        matchSource: prev.matchSource,
        teamSize: prev.teamSize,
        seasonId,
        status: "voting",
        voteEndsAt: new Date(Date.now() + RANKED_VOTE_SECONDS * 1000),
      },
    });

    await tx.rankedMatchAcceptance.createMany({
      data: playerIds.map((pid) => ({
        sessionId: created.id,
        userId: pid,
        accepted: true,
        acceptedAt: new Date(),
      })),
    });

    if (prev.lobbyRoomId) {
      await tx.lobbyRoom.update({
        where: { id: prev.lobbyRoomId },
        data: { status: "in_match", matchId: created.id },
      });
    }

    return tx.rankedMatchSession.findUniqueOrThrow({
      where: { id: created.id },
      include: sessionInclude,
    });
  });

  await markPartiesInMatch(next.partyAId, next.partyBId);
  await notifyRankedVoteStarted(playerIds);
  void notifySessionParticipants(next.id, "session");
  void notifyRankedRooms("session");

  return serializeSession(next, userId);
}

export async function swapTeamsRematch(userId: string, sessionId: string) {
  const prev = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!prev) throw new RankedPartyError("sessionNotFound", 404);
  if (prev.status !== "finished") {
    throw new RankedPartyError("swapTeamsAfterEnd", 400);
  }
  if (!getUserTeam(prev, userId)) {
    throw new RankedPartyError("notInRoom", 403);
  }

  const seasonId = prev.seasonId ?? (await resolveRankedMatchSeasonId());
  const swapped = await prisma.$transaction(async (tx) => {
    const created = await tx.rankedMatchSession.create({
      data: {
        partyAId: prev.partyBId,
        partyBId: prev.partyAId,
        lobbyRoomId: prev.lobbyRoomId,
        matchSource: prev.matchSource,
        teamSize: prev.teamSize,
        seasonId,
        status: "voting",
        voteEndsAt: new Date(Date.now() + RANKED_VOTE_SECONDS * 1000),
      },
    });

    const playerIds = getSessionPlayerIds(prev);
    await tx.rankedMatchAcceptance.createMany({
      data: playerIds.map((pid) => ({
        sessionId: created.id,
        userId: pid,
        accepted: true,
        acceptedAt: new Date(),
      })),
    });

    if (prev.lobbyRoomId) {
      await tx.lobbyRoom.update({
        where: { id: prev.lobbyRoomId },
        data: { status: "in_match", matchId: created.id },
      });
    }

    return tx.rankedMatchSession.findUniqueOrThrow({
      where: { id: created.id },
      include: sessionInclude,
    });
  });

  await markPartiesInMatch(swapped.partyAId, swapped.partyBId);
  await notifyRankedVoteStarted(getSessionPlayerIds(swapped));
  void notifySessionParticipants(swapped.id, "session");
  void notifyRankedRooms("session");

  return serializeSession(swapped, userId);
}

export async function leaveMatchRoom(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: true },
  });
  if (!membership) return { ok: true as const };

  const active = await prisma.rankedMatchSession.findFirst({
    where: {
      status: { in: ["accepting", "voting", "starting", "live"] },
      OR: [{ partyAId: membership.partyId }, { partyBId: membership.partyId }],
    },
  });
  if (active) {
    await abandonRankedSessionInternal(
      active.id,
      ["live", "starting"].includes(active.status) ? "finish" : "cancel",
    );
  }

  await prisma.rankedPartyMember.delete({ where: { userId } });

  const remaining = await prisma.rankedPartyMember.count({
    where: { partyId: membership.partyId },
  });
  if (remaining === 0) {
    await prisma.rankedParty.update({
      where: { id: membership.partyId },
      data: { status: "disbanded" },
    });
  } else {
    const teamSize = RANKED_TEAM_SIZE;
    await prisma.rankedParty.update({
      where: { id: membership.partyId },
      data: { status: remaining >= teamSize ? "full" : "open" },
    });
  }

  return { ok: true as const };
}
