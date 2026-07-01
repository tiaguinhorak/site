import "server-only";

import { prisma } from "@/lib/prisma";
import { RANKED_MATCH_SIZE, RANKED_TEAM_SIZE } from "@/lib/ranked";
import { notifyRankedMatchReady } from "@/lib/ranked/notifications";
import {
  notifyPartyMembers,
  notifyRankedRooms,
  notifySessionParticipants,
} from "@/lib/realtime/notify";
import { RankedPartyError, RankedQueueError } from "@/lib/errors/domain";
import { planPriorityWeight } from "@/lib/plan-priority";
import { assertCanEnterRankedQueue, PlayStateError } from "@/lib/play-state";

import { resolveRankedMatchSeasonId } from "@/lib/ranked/season-match";

export { RankedQueueError } from "@/lib/errors/domain";

export type RankedQueueStatusView = {
  searching: boolean;
  partyId: string | null;
  playerCount: number;
  playersInQueue: number;
  partiesInQueue: number;
  estimatedWaitSec: number | null;
  joinedAt: string | null;
};

type QueueEntryRow = {
  id: string;
  partyId: string;
  playerCount: number;
  avgElo: number;
  planPriority: number;
  joinedAt: Date;
};

function findExactTenPlayerSet(entries: QueueEntryRow[]): QueueEntryRow[] | null {
  function search(
    start: number,
    picked: QueueEntryRow[],
    sum: number,
  ): QueueEntryRow[] | null {
    if (sum === RANKED_MATCH_SIZE) return picked;
    if (sum > RANKED_MATCH_SIZE) return null;

    for (let index = start; index < entries.length; index++) {
      const entry = entries[index]!;
      const result = search(index + 1, [...picked, entry], sum + entry.playerCount);
      if (result) return result;
    }
    return null;
  }

  return search(0, [], 0);
}

function partitionTeams(entries: QueueEntryRow[]): [QueueEntryRow[], QueueEntryRow[]] | null {
  const total = entries.reduce((sum, entry) => sum + entry.playerCount, 0);
  if (total !== RANKED_MATCH_SIZE) return null;

  function pickTeam(
    remaining: QueueEntryRow[],
    picked: QueueEntryRow[],
    sum: number,
  ): QueueEntryRow[] | null {
    if (sum === RANKED_TEAM_SIZE) return picked;
    if (sum > RANKED_TEAM_SIZE || remaining.length === 0) return null;

    const [first, ...rest] = remaining;
    const withFirst = pickTeam(rest, [...picked, first], sum + first.playerCount);
    if (withFirst) return withFirst;
    return pickTeam(rest, picked, sum);
  }

  const teamA = pickTeam(entries, [], 0);
  if (!teamA) return null;

  const teamAIds = new Set(teamA.map((entry) => entry.id));
  const teamB = entries.filter((entry) => !teamAIds.has(entry.id));
  const teamBSize = teamB.reduce((sum, entry) => sum + entry.playerCount, 0);
  if (teamBSize !== RANKED_TEAM_SIZE) return null;

  return [teamA, teamB];
}

async function collectPartyUserIds(partyIds: string[]): Promise<string[]> {
  const members = await prisma.rankedPartyMember.findMany({
    where: { partyId: { in: partyIds } },
    orderBy: [{ partyId: "asc" }, { slotIndex: "asc" }],
  });
  return members.map((member) => member.userId);
}

async function buildMatchParty(userIds: string[]) {
  if (userIds.length !== RANKED_TEAM_SIZE) {
    throw new RankedQueueError("invalidTeamForMatch", 500);
  }

  const leaderUserId = userIds[0]!;

  return prisma.$transaction(async (tx) => {
    const oldPartyIds = (
      await tx.rankedPartyMember.findMany({
        where: { userId: { in: userIds } },
        select: { partyId: true },
      })
    ).map((row) => row.partyId);

    await tx.rankedPartyMember.deleteMany({ where: { userId: { in: userIds } } });
    await tx.rankedQueueEntry.deleteMany({ where: { partyId: { in: oldPartyIds } } });

    const party = await tx.rankedParty.create({
      data: { leaderUserId, status: "in_match" },
    });

    await tx.rankedPartyMember.createMany({
      data: userIds.map((userId, slotIndex) => ({
        partyId: party.id,
        userId,
        slotIndex,
      })),
    });

    for (const oldPartyId of oldPartyIds) {
      const remaining = await tx.rankedPartyMember.count({ where: { partyId: oldPartyId } });
      if (remaining === 0) {
        await tx.rankedParty.update({
          where: { id: oldPartyId },
          data: { status: "disbanded" },
        });
      }
    }

    return party.id;
  });
}

async function resolveTeamParty(entryPartyIds: string[]): Promise<string> {
  if (entryPartyIds.length === 1) {
    const partyId = entryPartyIds[0]!;
    const party = await prisma.rankedParty.findUnique({
      where: { id: partyId },
      include: { members: true },
    });
    if (party && party.members.length === RANKED_TEAM_SIZE) {
      await prisma.rankedQueueEntry.deleteMany({ where: { partyId } });
      return partyId;
    }
  }

  const userIds = await collectPartyUserIds(entryPartyIds);
  return buildMatchParty(userIds);
}

export async function createMatchSessionFromQueue(partyAId: string, partyBId: string) {
  const [partyA, partyB] = await Promise.all([
    prisma.rankedParty.findUnique({
      where: { id: partyAId },
      include: { members: true },
    }),
    prisma.rankedParty.findUnique({
      where: { id: partyBId },
      include: { members: true },
    }),
  ]);

  if (!partyA || !partyB) throw new RankedQueueError("invalidLobby", 400);
  if (partyA.members.length !== RANKED_TEAM_SIZE || partyB.members.length !== RANKED_TEAM_SIZE) {
    throw new RankedQueueError("incompleteTeams", 400);
  }

  const allUserIds = [...partyA.members, ...partyB.members].map((member) => member.userId);
  const seasonId = await resolveRankedMatchSeasonId();

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.rankedMatchSession.create({
      data: {
        matchSource: "queue",
        partyAId,
        partyBId,
        seasonId,
        status: "accepting",
      },
    });

    await tx.rankedMatchAcceptance.createMany({
      data: allUserIds.map((userId) => ({ sessionId: created.id, userId })),
    });

    await tx.rankedParty.updateMany({
      where: { id: { in: [partyAId, partyBId] } },
      data: { status: "in_match" },
    });

    return created;
  });

  await notifyRankedMatchReady(allUserIds);
  void notifySessionParticipants(session.id, "session");
  void notifyRankedRooms("session");
  return session.id;
}

async function tryFormMatchFromQueue(): Promise<string | null> {
  const entries = await prisma.rankedQueueEntry.findMany({
    where: { status: "searching" },
    orderBy: [{ joinedAt: "asc" }, { planPriority: "desc" }],
    take: 32,
  });

  const matchSet = findExactTenPlayerSet(entries);
  if (!matchSet) return null;

  const teams = partitionTeams(matchSet);
  if (!teams) return null;

  const [teamAEntries, teamBEntries] = teams;

  const claimed = await prisma.rankedQueueEntry.updateMany({
    where: {
      id: { in: matchSet.map((entry) => entry.id) },
      status: "searching",
    },
    data: { status: "matched" },
  });
  if (claimed.count !== matchSet.length) return null;

  const matchPartyAId = await resolveTeamParty(teamAEntries.map((entry) => entry.partyId));
  const matchPartyBId = await resolveTeamParty(teamBEntries.map((entry) => entry.partyId));
  return createMatchSessionFromQueue(matchPartyAId, matchPartyBId);
}

export async function getRankedQueueStatus(userId: string): Promise<RankedQueueStatusView> {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true, party: { select: { members: true } } },
  });

  const [entry, queueStats] = await Promise.all([
    membership
      ? prisma.rankedQueueEntry.findUnique({
          where: { partyId: membership.partyId },
        })
      : Promise.resolve(null),
    prisma.rankedQueueEntry.aggregate({
      where: { status: "searching" },
      _count: { id: true },
      _sum: { playerCount: true },
    }),
  ]);

  const searching = entry?.status === "searching";
  const playersInQueue = queueStats._sum.playerCount ?? 0;
  const partiesInQueue = queueStats._count.id ?? 0;
  const missing = Math.max(0, RANKED_MATCH_SIZE - playersInQueue);

  return {
    searching,
    partyId: membership?.partyId ?? null,
    playerCount: membership?.party.members.length ?? 0,
    playersInQueue,
    partiesInQueue,
    estimatedWaitSec: searching ? Math.max(15, missing * 12) : null,
    joinedAt: entry?.joinedAt.toISOString() ?? null,
  };
}

export async function joinRankedQueue(userId: string) {
  const state = await assertCanEnterRankedQueue(userId);

  const party = await prisma.rankedParty.findUnique({
    where: { id: state.rankedPartyId! },
    include: { members: { include: { user: { select: { elo: true } } } } },
  });
  if (!party) throw new RankedQueueError("lobbyNotFound", 404);
  if (party.leaderUserId !== userId) {
    throw new RankedQueueError("leaderOnlyStartQueue", 403);
  }
  if (party.status === "in_match") {
    throw new RankedQueueError("lobbyInMatch", 409);
  }

  const leader = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!leader) throw new RankedQueueError("userNotFound", 404);

  const avgElo = Math.round(
    party.members.reduce((sum, member) => sum + member.user.elo, 0) / party.members.length,
  );

  await prisma.rankedQueueEntry.upsert({
    where: { partyId: party.id },
    create: {
      partyId: party.id,
      leaderUserId: userId,
      playerCount: party.members.length,
      avgElo,
      planPriority: planPriorityWeight(leader.plan),
      status: "searching",
    },
    update: {
      leaderUserId: userId,
      playerCount: party.members.length,
      avgElo,
      planPriority: planPriorityWeight(leader.plan),
      status: "searching",
      joinedAt: new Date(),
    },
  });

  await tryFormMatchFromQueue();

  void notifyPartyMembers(party.id, "session");
  void notifyRankedRooms("session");
  return getRankedQueueStatus(userId);
}

/** Try to form a new ranked match after parties return to queue (e.g. post-match). */
export async function triggerQueueMatchmaking(): Promise<void> {
  await tryFormMatchFromQueue();
}

export async function leaveRankedQueue(userId: string) {
  const membership = await prisma.rankedPartyMember.findUnique({
    where: { userId },
    select: { partyId: true, party: { select: { leaderUserId: true } } },
  });
  if (!membership) throw new RankedQueueError("notInLobby", 400);
  if (membership.party.leaderUserId !== userId) {
    throw new RankedQueueError("leaderOnlyCancelQueue", 403);
  }

  await prisma.rankedQueueEntry.deleteMany({
    where: { partyId: membership.partyId, status: "searching" },
  });

  void notifyPartyMembers(membership.partyId, "session");
  void notifyRankedRooms("session");
  return getRankedQueueStatus(userId);
}

export async function cancelRankedQueueForParty(partyId: string) {
  await prisma.rankedQueueEntry.deleteMany({
    where: { partyId, status: "searching" },
  });
  void notifyPartyMembers(partyId, "session");
  void notifyRankedRooms("session");
}

export function mapPlayStateError(err: unknown): never {
  if (err instanceof PlayStateError) throw err;
  if (err instanceof RankedQueueError) throw err;
  throw err;
}
