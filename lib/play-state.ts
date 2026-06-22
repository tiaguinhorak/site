import "server-only";

import { prisma } from "@/lib/prisma";
import { reconcileStaleSessionsForUser } from "@/lib/ranked/reconcile-stale-sessions";
import { reconcileStaleLobbyMembership } from "@/lib/lobby/reconcile-membership";
import { PlayStateError } from "@/lib/errors/domain";

export { PlayStateError } from "@/lib/errors/domain";

export type UserPlayState = {
  lobbyRoomId: string | null;
  lobbyRoomName: string | null;
  rankedPartyId: string | null;
  rankedQueuePartyId: string | null;
  activeSessionId: string | null;
  activeSessionStatus: string | null;
};

export async function getUserPlayState(userId: string): Promise<UserPlayState> {
  await reconcileStaleSessionsForUser(userId);
  await reconcileStaleLobbyMembership(userId);

  const [lobbyMember, rankedMember, queueEntry, sessionMembership] = await Promise.all([
    prisma.lobbyMember.findFirst({
      where: { userId },
      select: { lobbyRoomId: true, lobbyRoom: { select: { name: true, status: true } } },
    }),
    prisma.rankedPartyMember.findUnique({
      where: { userId },
      select: { partyId: true, party: { select: { status: true } } },
    }),
    prisma.rankedQueueEntry.findFirst({
      where: {
        status: "searching",
        party: { members: { some: { userId } } },
      },
      select: { partyId: true },
    }),
    prisma.rankedPartyMember.findUnique({
      where: { userId },
      select: {
        party: {
          select: {
            matchSessionsAsA: {
              where: { status: { notIn: ["ended", "cancelled"] } },
              take: 1,
              select: { id: true, status: true },
            },
            matchSessionsAsB: {
              where: { status: { notIn: ["ended", "cancelled"] } },
              take: 1,
              select: { id: true, status: true },
            },
          },
        },
      },
    }),
  ]);

  const activeSession =
    sessionMembership?.party.matchSessionsAsA[0] ??
    sessionMembership?.party.matchSessionsAsB[0];

  return {
    lobbyRoomId: lobbyMember?.lobbyRoomId ?? null,
    lobbyRoomName: lobbyMember?.lobbyRoom?.name ?? null,
    rankedPartyId: rankedMember?.partyId ?? null,
    rankedQueuePartyId: queueEntry?.partyId ?? null,
    activeSessionId: activeSession?.id ?? null,
    activeSessionStatus: activeSession?.status ?? null,
  };
}

function lobbyBlockKey(roomName: string | null): PlayStateError {
  if (roomName) {
    return new PlayStateError("inOtherLobby", 409, { roomName }, "lobby");
  }
  return new PlayStateError("inOtherLobbyGeneric", 409, undefined, "lobby");
}

export async function assertCanJoinLobby(
  userId: string,
  targetRoomId?: string,
): Promise<UserPlayState> {
  const state = await getUserPlayState(userId);

  if (state.activeSessionId) {
    throw new PlayStateError(
      "activeRankedMatchBlocksLobby",
      409,
      undefined,
      "ranked_match",
    );
  }

  if (state.rankedQueuePartyId) {
    throw new PlayStateError(
      "rankedQueueBlocksLobby",
      409,
      undefined,
      "ranked_queue",
    );
  }

  if (state.lobbyRoomId && state.lobbyRoomId !== targetRoomId) {
    throw lobbyBlockKey(state.lobbyRoomName);
  }

  return state;
}

export async function assertCanJoinRankedParty(
  userId: string,
  targetPartyId?: string,
): Promise<UserPlayState> {
  const state = await getUserPlayState(userId);

  if (state.lobbyRoomId) {
    throw lobbyBlockKey(state.lobbyRoomName);
  }

  if (state.activeSessionId) {
    throw new PlayStateError(
      "activeRankedMatch",
      409,
      undefined,
      "ranked_match",
    );
  }

  if (state.rankedPartyId && state.rankedPartyId !== targetPartyId) {
    throw new PlayStateError(
      "alreadyInOtherRankedParty",
      409,
      undefined,
      "ranked_party",
    );
  }

  return state;
}

export async function assertCanEnterRankedQueue(userId: string): Promise<UserPlayState> {
  const state = await getUserPlayState(userId);

  if (state.lobbyRoomId) {
    throw lobbyBlockKey(state.lobbyRoomName);
  }

  if (state.activeSessionId) {
    throw new PlayStateError(
      "alreadyInRankedMatch",
      409,
      undefined,
      "ranked_match",
    );
  }

  if (state.rankedQueuePartyId) {
    throw new PlayStateError("lobbyAlreadyInQueue", 409, undefined, "ranked_queue");
  }

  if (!state.rankedPartyId) {
    throw new PlayStateError("needRankedLobbyFirst", 400, undefined, "ranked_party");
  }

  return state;
}
