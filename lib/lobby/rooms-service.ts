import "server-only";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getAvatarInitials } from "@/lib/profile";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { serializeProfileCustomization, type PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { planPriorityWeight } from "@/lib/plan-priority";
import { assertCanJoinLobby, PlayStateError } from "@/lib/play-state";
import {
  DEFAULT_LOBBY_SETTINGS,
  type CreateLobbyRoomInput,
  type LobbyRoomSettings,
  type UpdateLobbyRoomInput,
} from "@/lib/lobby/schemas";
import { eloToLobbyLevel, regionPingEstimate } from "@/lib/lobby/utils";
import { ensureSystemLobbyRooms } from "@/lib/lobby/provision-system-rooms";
import { cleanupLobbyMembersForClosedRooms } from "@/lib/lobby/reconcile-membership";
import { notifyLobbyRooms } from "@/lib/realtime/notify";
import { LobbyRoomError } from "@/lib/errors/domain";
import type { Plan } from "@/lib/generated/prisma/client";

export { LobbyRoomError } from "@/lib/errors/domain";

const LOBBY_TTL_HOURS = 6;
const CASUAL_MODE_SLUGS = new Set(["competitive"]);
const LOBBY_MAINTENANCE_MS = 60_000;
let lastLobbyMaintenanceAt = 0;

function parseSettings(raw: unknown): LobbyRoomSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_LOBBY_SETTINGS };
  return { ...DEFAULT_LOBBY_SETTINGS, ...(raw as LobbyRoomSettings) };
}

function computeStatus(playerCount: number, slots: number, current: string): string {
  if (current === "closed" || current === "in_match") return current;
  if (playerCount >= slots) return "full";
  return "open";
}

export async function cleanupExpiredLobbyRooms() {
  const now = new Date();
  const toClose = await prisma.lobbyRoom.findMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        {
          status: { in: ["open", "full"] },
          updatedAt: { lt: new Date(Date.now() - LOBBY_TTL_HOURS * 3600_000) },
        },
      ],
      status: { notIn: ["closed", "in_match"] },
    },
    select: { id: true },
  });

  if (toClose.length === 0) return;

  const roomIds = toClose.map((room) => room.id);
  await cleanupLobbyMembersForClosedRooms(roomIds);
  await prisma.lobbyRoom.updateMany({
    where: { id: { in: roomIds } },
    data: { status: "closed" },
  });
}

const lobbyInclude = {
  gameMode: true,
  host: {
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      avatarPreset: true,
      steamAvatarUrl: true,
      steamLinkedAt: true,
      elo: true,
      plan: true,
    },
  },
  members: {
    orderBy: { slotIndex: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          avatarPreset: true,
          steamAvatarUrl: true,
          steamPersonaName: true,
          steamLinkedAt: true,
          elo: true,
          country: true,
          steamCountryCode: true,
          plan: true,
          profileBannerUrl: true,
          profileBannerMediaType: true,
          profileBannerModerationStatus: true,
          profileBackgroundId: true,
          profileBackgroundColor: true,
          profileFrameId: true,
          profileFrameColor: true,
          profileAccentColor: true,
          profileThemeId: true,
          profileThemeColor: true,
          profileBorderId: true,
          profileBorderColor: true,
          profileShowPlanBadge: true,
          profileShowAchievements: true,
          avatarMediaType: true,
          avatarModerationStatus: true,
          isAdmin: true,
        },
      },
    },
  },
};

type LobbyWithRelations = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.lobbyRoom.findFirst<{
        include: typeof lobbyInclude;
      }>
    >
  >
>;

export type SerializedMember = {
  id: string;
  nickname: string;
  level: number;
  avatarUrl: string | null;
  avatarInitials: string;
  customization: PublicProfileCustomization | null;
  steamVerified: boolean;
  slotIndex: number;
  isReady: boolean;
  isHost: boolean;
};

export type SerializedLobbyRoom = {
  id: string;
  source: "user";
  name: string;
  map: string;
  players: number;
  slots: number;
  ping: number;
  modeId: string;
  modeName: string;
  accent: string;
  region: string;
  visibility: string;
  hasPassword: boolean;
  status: string;
  hostUserId: string;
  hostNickname: string;
  settings: LobbyRoomSettings;
  isHost: boolean;
  isMember: boolean;
  members: SerializedMember[];
  createdAt: string;
  expiresAt: string | null;
};

function serializeLobbyRoom(
  room: LobbyWithRelations,
  viewerUserId?: string,
): SerializedLobbyRoom {
  const members: SerializedMember[] = room.members.map((m) => ({
    id: m.user.id,
    nickname: m.user.nickname,
    level: eloToLobbyLevel(m.user.elo),
    avatarUrl: resolveUserAvatarUrl(m.user),
    avatarInitials: getAvatarInitials("", "", m.user.nickname),
    customization: serializeProfileCustomization(m.user),
    steamVerified: Boolean(m.user.steamLinkedAt),
    slotIndex: m.slotIndex,
    isReady: m.isReady,
    isHost: m.userId === room.hostUserId,
  }));

  return {
    id: room.id,
    source: "user",
    name: room.name,
    map: room.map,
    players: room.members.length,
    slots: room.slots,
    ping: room.ping,
    modeId: room.gameMode.slug,
    modeName: room.gameMode.name,
    accent: room.gameMode.accent,
    region: room.region,
    visibility: room.visibility,
    hasPassword: Boolean(room.passwordHash),
    status: room.status,
    hostUserId: room.hostUserId,
    hostNickname: room.host.nickname,
    settings: parseSettings(room.settings),
    isHost: viewerUserId === room.hostUserId,
    isMember: viewerUserId
      ? room.members.some((m) => m.userId === viewerUserId)
      : false,
    members,
    createdAt: room.createdAt.toISOString(),
    expiresAt: room.expiresAt?.toISOString() ?? null,
  };
}

async function maybeMaintainLobbyRooms(): Promise<void> {
  const now = Date.now();
  if (now - lastLobbyMaintenanceAt < LOBBY_MAINTENANCE_MS) return;
  lastLobbyMaintenanceAt = now;
  await cleanupExpiredLobbyRooms();
  await ensureSystemLobbyRooms();
}

export async function listActiveLobbyRooms(viewerUserId?: string) {
  await maybeMaintainLobbyRooms();

  const rooms = await prisma.lobbyRoom.findMany({
    where: {
      isSystem: true,
      status: { in: ["open", "full", "starting"] },
      gameMode: { slug: { notIn: [...CASUAL_MODE_SLUGS] } },
    },
    include: lobbyInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rooms.map((room) => serializeLobbyRoom(room, viewerUserId));
}

export async function getLobbyRoomById(id: string, viewerUserId?: string) {
  const room = await prisma.lobbyRoom.findUnique({
    where: { id },
    include: lobbyInclude,
  });
  if (!room) throw new LobbyRoomError("roomNotFound", 404);
  return serializeLobbyRoom(room, viewerUserId);
}

export async function createLobbyRoom(
  _userId: string,
  _plan: Plan,
  _input: CreateLobbyRoomInput,
) {
  throw new LobbyRoomError("roomsAutoCreated", 403);
}

export async function updateLobbyRoom(
  roomId: string,
  userId: string,
  input: UpdateLobbyRoomInput,
) {
  const room = await prisma.lobbyRoom.findUnique({
    where: { id: roomId },
    include: { members: true },
  });
  if (!room) throw new LobbyRoomError("roomNotFound", 404);
  if (room.isSystem) {
    throw new LobbyRoomError("systemRoomNoEdit", 403);
  }
  if (room.hostUserId !== userId) {
    throw new LobbyRoomError("hostOnlyEdit", 403);
  }
  if (room.status === "in_match" || room.status === "closed") {
    throw new LobbyRoomError("roomNotEditableState", 400);
  }

  const settings = input.settings
    ? { ...parseSettings(room.settings), ...input.settings }
    : parseSettings(room.settings);

  let passwordHash = room.passwordHash;
  if (input.clearPassword) passwordHash = null;
  else if (input.password && input.password.length > 0) {
    passwordHash = await hashPassword(input.password);
  }

  await prisma.lobbyRoom.update({
    where: { id: roomId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.map !== undefined ? { map: input.map } : {}),
      ...(input.slots !== undefined ? { slots: input.slots } : {}),
      ...(input.region !== undefined
        ? { region: input.region, ping: regionPingEstimate(input.region) }
        : {}),
      visibility: input.visibility ?? room.visibility,
      passwordHash,
      settings,
      status: computeStatus(room.members.length, input.slots ?? room.slots, room.status),
    },
  });

  void notifyLobbyRooms("rooms");
  return getLobbyRoomById(roomId, userId);
}

export async function closeLobbyRoom(roomId: string, userId: string) {
  const room = await prisma.lobbyRoom.findUnique({ where: { id: roomId } });
  if (!room) throw new LobbyRoomError("roomNotFound", 404);
  if (room.isSystem) {
    throw new LobbyRoomError("systemRoomNoClose", 403);
  }
  if (room.hostUserId !== userId) {
    throw new LobbyRoomError("hostOnlyClose", 403);
  }

  await prisma.lobbyRoom.update({
    where: { id: roomId },
    data: { status: "closed" },
  });

  void notifyLobbyRooms("rooms");
  return { ok: true };
}

function nextFreeSlot(usedSlots: Set<number>, maxSlots: number): number {
  let slotIndex = 0;
  while (usedSlots.has(slotIndex) && slotIndex < maxSlots) slotIndex += 1;
  return slotIndex;
}

async function lockLobbyRoom(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], roomId: string) {
  await tx.$executeRaw`SELECT id FROM "LobbyRoom" WHERE id = ${roomId} FOR UPDATE`;
}

async function processLobbyJoinQueue(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  roomId: string,
) {
  const room = await tx.lobbyRoom.findUnique({
    where: { id: roomId },
    include: { members: true },
  });
  if (!room) return;

  let spotsLeft = room.slots - room.members.length;
  if (spotsLeft <= 0) {
    await tx.lobbyJoinQueue.deleteMany({ where: { lobbyRoomId: roomId } });
    return;
  }

  const memberIds = new Set(room.members.map((m) => m.userId));
  const queue = await tx.lobbyJoinQueue.findMany({
    where: { lobbyRoomId: roomId },
    orderBy: [{ planPriority: "desc" }, { requestedAt: "asc" }],
  });

  const usedSlots = new Set(room.members.map((m) => m.slotIndex));

  for (const entry of queue) {
    if (spotsLeft <= 0) break;
    if (memberIds.has(entry.userId)) {
      await tx.lobbyJoinQueue.delete({ where: { id: entry.id } });
      continue;
    }

    const slotIndex = nextFreeSlot(usedSlots, room.slots);
    await tx.lobbyMember.create({
      data: { lobbyRoomId: roomId, userId: entry.userId, slotIndex },
    });
    usedSlots.add(slotIndex);
    memberIds.add(entry.userId);
    spotsLeft -= 1;
    await tx.lobbyJoinQueue.delete({ where: { id: entry.id } });
  }

  const newCount = await tx.lobbyMember.count({ where: { lobbyRoomId: roomId } });
  await tx.lobbyRoom.update({
    where: { id: roomId },
    data: {
      status: computeStatus(newCount, room.slots, room.status),
      updatedAt: new Date(),
    },
  });

  if (newCount >= room.slots) {
    await tx.lobbyJoinQueue.deleteMany({ where: { lobbyRoomId: roomId } });
  }
}

export async function joinLobbyRoom(
  roomId: string,
  userId: string,
  password?: string,
) {
  await assertCanJoinLobby(userId, roomId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamLinkedAt: true, elo: true, plan: true },
  });
  if (!user?.steamLinkedAt) {
    throw new LobbyRoomError("steamRequiredJoin", 403);
  }

  const planPriority = planPriorityWeight(user.plan);

  const preRoom = await prisma.lobbyRoom.findUnique({
    where: { id: roomId },
    include: { members: true },
  });
  if (!preRoom) throw new LobbyRoomError("roomNotFound", 404);
  if (preRoom.status === "closed" || preRoom.status === "in_match") {
    throw new LobbyRoomError("roomUnavailable", 400);
  }

  const existing = preRoom.members.find((m) => m.userId === userId);
  if (existing) return getLobbyRoomById(roomId, userId);

  if (preRoom.visibility === "private" && preRoom.passwordHash) {
    if (!password || !(await verifyPassword(password, preRoom.passwordHash))) {
      throw new LobbyRoomError("wrongPassword", 401);
    }
  }

  const settings = parseSettings(preRoom.settings);
  const level = eloToLobbyLevel(user.elo);
  if (level < settings.minLevel || level > settings.maxLevel) {
    throw new LobbyRoomError("levelOutOfRange", 403, {
      level: String(level),
      min: String(settings.minLevel),
      max: String(settings.maxLevel),
    });
  }

  const spotsLeft = preRoom.slots - preRoom.members.length;
  if (spotsLeft <= 0) {
    throw new LobbyRoomError("roomFull", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockLobbyRoom(tx, roomId);

      const room = await tx.lobbyRoom.findUnique({
        where: { id: roomId },
        include: { members: true },
      });
      if (!room) throw new LobbyRoomError("roomNotFound", 404);

      if (room.members.some((m) => m.userId === userId)) return;

      const available = room.slots - room.members.length;
      if (available <= 0) throw new LobbyRoomError("roomFull", 409);

      if (available === 1) {
        await tx.lobbyJoinQueue.upsert({
          where: { lobbyRoomId_userId: { lobbyRoomId: roomId, userId } },
          create: { lobbyRoomId: roomId, userId, planPriority },
          update: { planPriority, requestedAt: new Date() },
        });
        await processLobbyJoinQueue(tx, roomId);

        const joined = await tx.lobbyMember.findFirst({
          where: { lobbyRoomId: roomId, userId },
        });
        if (!joined) {
          throw new LobbyRoomError("roomFilledOnClick", 409);
        }
        return;
      }

      const usedSlots = new Set(room.members.map((m) => m.slotIndex));
      const slotIndex = nextFreeSlot(usedSlots, room.slots);

      await tx.lobbyMember.create({
        data: { lobbyRoomId: roomId, userId, slotIndex },
      });
      await tx.lobbyJoinQueue.deleteMany({ where: { lobbyRoomId: roomId, userId } });

      const newCount = room.members.length + 1;
      await tx.lobbyRoom.update({
        where: { id: roomId },
        data: {
          status: computeStatus(newCount, room.slots, room.status),
          updatedAt: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof LobbyRoomError) throw err;
    if (err instanceof PlayStateError) throw err;
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("LobbyMember_userId_key") || msg.includes("Unique constraint")) {
      throw new LobbyRoomError("alreadyInOtherRoom", 409);
    }
    throw err;
  }

  void notifyLobbyRooms("rooms");
  return getLobbyRoomById(roomId, userId);
}

export async function leaveLobbyRoom(roomId: string, userId: string) {
  const room = await prisma.lobbyRoom.findUnique({
    where: { id: roomId },
    include: { members: { orderBy: { joinedAt: "asc" } } },
  });
  if (!room) throw new LobbyRoomError("roomNotFound", 404);

  const member = room.members.find((m) => m.userId === userId);
  if (!member) throw new LobbyRoomError("notInRoom", 400);

  await prisma.lobbyMember.delete({ where: { id: member.id } });

  const remaining = room.members.filter((m) => m.userId !== userId);

  if (remaining.length === 0) {
    await prisma.lobbyRoom.update({
      where: { id: roomId },
      data: { status: "closed" },
    });
    void notifyLobbyRooms("rooms");
    return { ok: true, closed: true };
  }

  if (room.hostUserId === userId) {
    await prisma.lobbyRoom.update({
      where: { id: roomId },
      data: {
        hostUserId: remaining[0]!.userId,
        status: computeStatus(remaining.length, room.slots, room.status),
      },
    });
  } else {
    await prisma.lobbyRoom.update({
      where: { id: roomId },
      data: { status: computeStatus(remaining.length, room.slots, room.status) },
    });
  }

  void notifyLobbyRooms("rooms");
  return { ok: true, closed: false };
}

export async function pickAutoJoinRoom(userId: string, modeSlug?: string) {
  await cleanupExpiredLobbyRooms();

  const modeFilter =
    modeSlug && modeSlug !== "all"
      ? { slug: modeSlug }
      : { slug: { notIn: [...CASUAL_MODE_SLUGS] } };

  const rooms = await prisma.lobbyRoom.findMany({
    where: {
      status: "open",
      visibility: "public",
      passwordHash: null,
      isSystem: true,
      gameMode: modeFilter,
    },
    include: { members: true, gameMode: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  const level = eloToLobbyLevel(user?.elo ?? 1000);

  const candidates = rooms
    .filter((room) => {
      const settings = parseSettings(room.settings);
      if (level < settings.minLevel || level > settings.maxLevel) return false;
      if (room.members.some((m) => m.userId === userId)) return false;
      return room.members.length < room.slots;
    })
    .sort((a, b) => {
      const fillA = a.members.length / a.slots;
      const fillB = b.members.length / b.slots;
      if (fillA !== fillB) return fillB - fillA;
      return a.ping - b.ping;
    });

  const target = candidates[0];
  if (!target) throw new LobbyRoomError("noRoomAvailable", 404);

  return joinLobbyRoom(target.id, userId);
}
