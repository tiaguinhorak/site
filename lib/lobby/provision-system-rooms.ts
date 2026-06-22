import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_LOBBY_SETTINGS } from "@/lib/lobby/schemas";

const SYSTEM_MODE_EXCLUDE = new Set(["competitive"]);

function deriveLobbyStatus(
  memberCount: number,
  slots: number,
  currentStatus: string,
): string {
  if (currentStatus === "in_match" || currentStatus === "closed") return currentStatus;
  return memberCount >= slots ? "full" : "open";
}

/** Garante uma LobbyRoom por GameModeRoom (salas gerenciadas pelo sistema). */
export async function ensureSystemLobbyRooms() {
  const systemHost = await prisma.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!systemHost) return;

  const catalogRooms = await prisma.gameModeRoom.findMany({
    include: {
      gameMode: true,
      lobbyRoom: { include: { _count: { select: { members: true } } } },
    },
    orderBy: [{ gameMode: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  for (const catalog of catalogRooms) {
    if (SYSTEM_MODE_EXCLUDE.has(catalog.gameMode.slug)) continue;

    const memberCount = catalog.lobbyRoom?._count.members ?? 0;
    const currentStatus = catalog.lobbyRoom?.status ?? "open";
    const status = deriveLobbyStatus(memberCount, catalog.slots, currentStatus);

    const baseData = {
      name: catalog.name,
      map: catalog.map,
      slots: catalog.slots,
      ping: catalog.ping,
      visibility: "public" as const,
      passwordHash: null,
      status,
      isSystem: true,
      region: "BR",
      settings: DEFAULT_LOBBY_SETTINGS,
    };

    if (catalog.lobbyRoom) {
      await prisma.lobbyRoom.update({
        where: { id: catalog.lobbyRoom.id },
        data: baseData,
      });
      continue;
    }

    await prisma.lobbyRoom.create({
      data: {
        ...baseData,
        hostUserId: systemHost.id,
        gameModeId: catalog.gameModeId,
        catalogRoomId: catalog.id,
      },
    });
  }
}
