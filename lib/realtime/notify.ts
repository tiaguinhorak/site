import "server-only";

import { prisma } from "@/lib/prisma";
import { publishInvalidate } from "@/lib/realtime/bus";
import type { RealtimeChannel, RealtimeInvalidateScope } from "@/lib/realtime/types";

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
