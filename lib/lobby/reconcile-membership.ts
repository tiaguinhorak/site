import "server-only";

import { prisma } from "@/lib/prisma";

const STALE_LOBBY_STATUSES = new Set(["closed", "in_match"]);

/**
 * Removes lobby membership when the room is closed or in_match without the user
 * actually being in an active lobby UI (members should not exist on in_match rooms).
 */
export async function reconcileStaleLobbyMembership(userId: string): Promise<void> {
  const member = await prisma.lobbyMember.findUnique({
    where: { userId },
    include: { lobbyRoom: { select: { status: true } } },
  });

  if (!member) return;

  const roomStatus = member.lobbyRoom?.status;
  if (!member.lobbyRoom || STALE_LOBBY_STATUSES.has(roomStatus)) {
    await prisma.$transaction([
      prisma.lobbyMember.delete({ where: { id: member.id } }),
      prisma.lobbyJoinQueue.deleteMany({ where: { userId } }),
    ]);
  }
}

export async function cleanupLobbyMembersForClosedRooms(roomIds: string[]): Promise<void> {
  if (roomIds.length === 0) return;
  await prisma.$transaction([
    prisma.lobbyMember.deleteMany({ where: { lobbyRoomId: { in: roomIds } } }),
    prisma.lobbyJoinQueue.deleteMany({ where: { lobbyRoomId: { in: roomIds } } }),
  ]);
}
