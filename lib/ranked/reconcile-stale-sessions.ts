import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelCsgoMatchIfActive, cancelCsgoMatchesForRoom } from "@/lib/csgo-api/cancel-stale-matches";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import { clearMatchServerBootstrap } from "@/lib/csgo-api/ensure-match-server";
import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { RANKED_ACCEPT_TTL_MS, RANKED_VOTE_SECONDS } from "@/lib/ranked/constants";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";
import { cleanupLobbyMembersForClosedRooms } from "@/lib/lobby/reconcile-membership";
import {
  partyStatusFromMemberCount,
  releaseLobbyRoomAfterMatch,
  resetPartiesAfterSession,
} from "@/lib/ranked/party-lifecycle";

const ACTIVE_STATUSES = ["accepting", "voting", "starting", "live"] as const;

const VOTE_GRACE_MS = 2 * 60 * 1000;
const STARTING_MAX_MS = 45 * 60 * 1000;
const LIVE_MAX_MS = 6 * 60 * 60 * 1000;
const ACCEPT_MAX_MS = RANKED_ACCEPT_TTL_MS * 2;
const LOBBY_IDLE_MS = 15 * 60 * 1000;

export type StaleReason =
  | "accept_timeout"
  | "vote_timeout"
  | "starting_stuck"
  | "live_expired"
  | "lobby_idle";

type SessionStaleInput = {
  status: string;
  matchSource: string;
  createdAt: Date;
  updatedAt: Date;
  voteEndsAt: Date | null;
};

export function isRankedSessionStale(session: SessionStaleInput): StaleReason | null {
  const now = Date.now();
  const age = now - session.createdAt.getTime();
  const idleMs = now - session.updatedAt.getTime();

  if (session.status === "accepting" && age > ACCEPT_MAX_MS) {
    return "accept_timeout";
  }

  if (session.status === "voting") {
    const voteEnd =
      session.voteEndsAt?.getTime() ??
      session.createdAt.getTime() + RANKED_VOTE_SECONDS * 1000;
    if (now > voteEnd + VOTE_GRACE_MS) return "vote_timeout";
  }

  if (session.status === "starting" && idleMs > STARTING_MAX_MS) {
    return "starting_stuck";
  }

  if (session.status === "live" && age > LIVE_MAX_MS) {
    return "live_expired";
  }

  if (
    session.matchSource === "lobby" &&
    ["voting", "starting", "live"].includes(session.status) &&
    idleMs > LOBBY_IDLE_MS
  ) {
    return "lobby_idle";
  }

  if (
    ["starting", "live"].includes(session.status) &&
    age > 2 * 60 * 60 * 1000 &&
    idleMs > 60 * 60 * 1000
  ) {
    return "starting_stuck";
  }

  return null;
}

function abandonModeForStatus(status: string): "cancel" | "finish" {
  return ["live", "starting"].includes(status) ? "finish" : "cancel";
}

async function runCsgoCleanup(task: () => Promise<void>, timeoutMs = 4_000): Promise<void> {
  try {
    await Promise.race([
      task(),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    /* API externa opcional — não bloqueia limpeza local */
  }
}

export async function abandonRankedSessionInternal(
  sessionId: string,
  mode?: "cancel" | "finish",
): Promise<boolean> {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      csgoMatchId: true,
      partyAId: true,
      partyBId: true,
      lobbyRoomId: true,
      teamSize: true,
    },
  });

  if (!session || !ACTIVE_STATUSES.includes(session.status as (typeof ACTIVE_STATUSES)[number])) {
    return false;
  }

  const resolvedMode = mode ?? abandonModeForStatus(session.status);
  const targetStatus =
    resolvedMode === "finish" && ["live", "starting"].includes(session.status)
      ? "finished"
      : "cancelled";

  clearMatchServerBootstrap(sessionId);

  const updated = await prisma.rankedMatchSession.updateMany({
    where: { id: sessionId, status: { in: [...ACTIVE_STATUSES] } },
    data: { status: targetStatus },
  });
  if (updated.count === 0) return false;

  if (session.csgoMatchId) {
    if (targetStatus === "finished") {
      await runCsgoCleanup(async () => {
        await csgoBackendFetch(`/api/matches/${session.csgoMatchId}/end`, { method: "POST" });
      });
    } else {
      await runCsgoCleanup(() => cancelCsgoMatchIfActive(session.csgoMatchId!));
    }
  }

  await runCsgoCleanup(() => cancelCsgoMatchesForRoom(sessionId, session.csgoMatchId).then(() => undefined));
  afterCsgoMatchMutation();

  await resetPartiesAfterSession(session.partyAId, session.partyBId, session.teamSize);
  await releaseLobbyRoomAfterMatch(session.lobbyRoomId);

  return true;
}

async function findActiveSessionsForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });

  const orClauses: Prisma.RankedMatchSessionWhereInput[] = [
    { acceptances: { some: { userId } } },
  ];
  if (membership) {
    orClauses.push({ partyAId: membership.partyId }, { partyBId: membership.partyId });
  }

  return prisma.rankedMatchSession.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      OR: orClauses,
    },
    select: {
      id: true,
      status: true,
      matchSource: true,
      createdAt: true,
      updatedAt: true,
      voteEndsAt: true,
    },
  });
}

export async function reconcileStaleSessionsForUser(userId: string): Promise<number> {
  const sessions = await findActiveSessionsForUser(userId);
  let cleared = 0;

  for (const session of sessions) {
    if (!isRankedSessionStale(session)) continue;
    if (await abandonRankedSessionInternal(session.id)) cleared++;
  }

  await reconcileOrphanInMatchPartiesForUser(userId);
  return cleared;
}

async function reconcileOrphanInMatchPartiesForUser(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: { include: { members: true } } },
  });
  if (!membership || membership.party.status !== "in_match") return;

  const active = await prisma.rankedMatchSession.findFirst({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      OR: [{ partyAId: membership.partyId }, { partyBId: membership.partyId }],
    },
  });
  if (active) return;

  const teamSize = membership.party.members.length <= 2 ? 2 : RANKED_TEAM_SIZE;
  await prisma.rankedParty.update({
    where: { id: membership.partyId },
    data: {
      status: partyStatusFromMemberCount(membership.party.members.length, teamSize),
    },
  });
}

export async function forceClearUserRankedState(userId: string): Promise<{ cleared: number }> {
  await reconcileStaleSessionsForUser(userId);

  const remaining = await findActiveSessionsForUser(userId);
  let cleared = 0;

  for (const session of remaining) {
    if (await abandonRankedSessionInternal(session.id)) cleared++;
  }

  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    include: { party: { include: { members: true } } },
  });

  if (membership) {
    const { cancelRankedQueueForParty } = await import("@/lib/ranked/queue-service");
    await cancelRankedQueueForParty(membership.partyId);

    if (membership.party.status === "in_match") {
      const teamSize = membership.party.members.length <= 2 ? 2 : RANKED_TEAM_SIZE;
      await prisma.rankedParty.update({
        where: { id: membership.partyId },
        data: {
          status: partyStatusFromMemberCount(membership.party.members.length, teamSize),
        },
      });
    }
  }

  return { cleared };
}

export async function reconcileAllStaleRankedSessions(): Promise<number> {
  const sessions = await prisma.rankedMatchSession.findMany({
    where: { status: { in: [...ACTIVE_STATUSES] } },
    select: {
      id: true,
      status: true,
      matchSource: true,
      createdAt: true,
      updatedAt: true,
      voteEndsAt: true,
    },
  });

  let cleared = 0;
  for (const session of sessions) {
    if (!isRankedSessionStale(session)) continue;
    if (await abandonRankedSessionInternal(session.id)) cleared++;
  }

  cleared += await reconcileOrphanInMatchParties();
  cleared += await reconcileStuckLobbyRooms();
  return cleared;
}

export async function reconcileOrphanInMatchParties(): Promise<number> {
  const parties = await prisma.rankedParty.findMany({
    where: { status: "in_match" },
    include: { members: true },
  });

  let fixed = 0;
  for (const party of parties) {
    const active = await prisma.rankedMatchSession.findFirst({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        OR: [{ partyAId: party.id }, { partyBId: party.id }],
      },
    });
    if (active) continue;

    const teamSize = party.members.length <= 2 ? 2 : RANKED_TEAM_SIZE;
    await prisma.rankedParty.update({
      where: { id: party.id },
      data: { status: partyStatusFromMemberCount(party.members.length, teamSize) },
    });
    fixed++;
  }
  return fixed;
}

export async function reconcileStuckLobbyRooms(): Promise<number> {
  const rooms = await prisma.lobbyRoom.findMany({
    where: { status: "in_match" },
    include: { rankedMatch: { select: { id: true, status: true } } },
  });

  let fixed = 0;
  for (const room of rooms) {
    const matchActive =
      room.rankedMatch &&
      ACTIVE_STATUSES.includes(room.rankedMatch.status as (typeof ACTIVE_STATUSES)[number]);

    if (!matchActive) {
      await cleanupLobbyMembersForClosedRooms([room.id]);
      await prisma.lobbyRoom.update({
        where: { id: room.id },
        data: { status: "open", matchId: null },
      });
      fixed++;
    }
  }
  return fixed;
}

export async function abandonRankedSessionsForCsgoMatch(
  csgoMatchId: string,
  mode: "cancel" | "finish",
): Promise<number> {
  const sessions = await prisma.rankedMatchSession.findMany({
    where: { csgoMatchId, status: { in: [...ACTIVE_STATUSES] } },
    select: { id: true },
  });

  let cleared = 0;
  for (const session of sessions) {
    if (await abandonRankedSessionInternal(session.id, mode)) cleared++;
  }
  return cleared;
}
