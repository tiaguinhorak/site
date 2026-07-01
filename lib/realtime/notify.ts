import "server-only";

import { prisma } from "@/lib/prisma";
import { publishInvalidate, publishRealtime } from "@/lib/realtime/bus";
import type {
  DirectMessagePayload,
  RankedInvitePayload,
  RealtimeChannel,
  RealtimeInvalidateScope,
} from "@/lib/realtime/types";

export function notifyRankedRooms(scope: RealtimeInvalidateScope = "rooms") {
  publishInvalidate([{ kind: "ranked_rooms" }], scope);
}

export function notifyLobbyRooms(scope: RealtimeInvalidateScope = "rooms") {
  publishInvalidate([{ kind: "lobby_rooms" }], scope);
}

export async function notifyUser(userId: string, scope: RealtimeInvalidateScope = "party") {
  publishInvalidate([{ kind: "user", userId }], scope);
}

export async function notifyPartyMembers(
  partyId: string,
  scope: RealtimeInvalidateScope = "party",
) {
  const members = await prisma.rankedPartyMember.findMany({
    where: { partyId },
    select: { userId: true },
  });

  const channels: RealtimeChannel[] = [
    { kind: "party", partyId },
    { kind: "ranked_rooms" },
    ...members.map((m) => ({ kind: "user" as const, userId: m.userId })),
  ];

  publishInvalidate(channels, scope);
}

export async function notifyParties(
  partyIds: string[],
  scope: RealtimeInvalidateScope = "party",
) {
  const unique = [...new Set(partyIds)];
  for (const partyId of unique) {
    await notifyPartyMembers(partyId, scope);
  }
}

/** Return the userIds of accepted friends for a given user. */
async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const edges = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return edges.map((e) => (e.requesterId === userId ? e.addresseeId : e.requesterId));
}

/** Tell a user's friends that their online status changed. */
export async function broadcastPresence(userId: string, online: boolean) {
  const friendIds = await getAcceptedFriendIds(userId);
  if (friendIds.length === 0) return;
  const channels: RealtimeChannel[] = friendIds.map((id) => ({
    kind: "user" as const,
    userId: id,
  }));
  publishRealtime(channels, { type: "presence", at: Date.now(), userId, online });
}

/** Deliver a direct message to both recipient and sender (multi-tab sync). */
export function publishDirectMessage(message: DirectMessagePayload) {
  const channels: RealtimeChannel[] = [
    { kind: "user", userId: message.recipientId },
    { kind: "user", userId: message.senderId },
  ];
  publishRealtime(channels, { type: "dm", at: Date.now(), message });
}

/** Deliver a ranked party invite to a target user. */
export function publishRankedInvite(targetUserId: string, invite: RankedInvitePayload) {
  publishRealtime([{ kind: "user", userId: targetUserId }], {
    type: "ranked_invite",
    at: Date.now(),
    invite,
  });
}

export async function notifySessionParticipants(
  sessionId: string,
  scope: RealtimeInvalidateScope = "session",
) {
  const session = await prisma.rankedMatchSession.findUnique({
    where: { id: sessionId },
    include: {
      partyA: { include: { members: { select: { userId: true } } } },
      partyB: { include: { members: { select: { userId: true } } } },
      acceptances: { select: { userId: true } },
    },
  });

  if (!session) return;

  const userIds = new Set<string>();
  for (const m of session.partyA.members) userIds.add(m.userId);
  for (const m of session.partyB.members) userIds.add(m.userId);
  for (const a of session.acceptances) userIds.add(a.userId);

  const channels: RealtimeChannel[] = [
    { kind: "ranked_rooms" },
    ...[...userIds].map((userId) => ({ kind: "user" as const, userId })),
  ];

  publishInvalidate(channels, scope);
}
