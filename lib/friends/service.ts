import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import {
  serializeProfileCustomization,
  type PublicProfileCustomization,
} from "@/lib/profile/serialize-customization";
import { fetchSteamFriendIds } from "@/lib/steam/friends";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

export class FriendError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

const FRIEND_USER_SELECT = {
  id: true,
  ...STEAM_DISPLAY_NAME_SELECT,
  country: true,
  avatarUrl: true,
  avatarPreset: true,
  steamAvatarUrl: true,
  plan: true,
  level: true,
  elo: true,
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
} satisfies Prisma.UserSelect;

export type FriendUser = {
  id: string;
  nickname: string;
  displayName: string;
  country: string;
  avatarUrl: string | null;
  plan: string;
  level: number;
  elo: number;
  customization: PublicProfileCustomization | null;
};

export type FriendRequestView = {
  friendshipId: string;
  user: FriendUser;
  createdAt: string;
};

export type FriendEntry = FriendUser & { friendshipId: string };

export type FriendsOverview = {
  friends: FriendEntry[];
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
};

type FriendUserRow = Prisma.UserGetPayload<{ select: typeof FRIEND_USER_SELECT }>;

function serializeFriendUser(user: FriendUserRow): FriendUser {
  return {
    id: user.id,
    nickname: user.nickname,
    displayName: resolveSteamDisplayName(user),
    country: user.country,
    avatarUrl: resolveUserAvatarUrl(user),
    plan: user.plan.toLowerCase(),
    level: user.level,
    elo: user.elo,
    customization: serializeProfileCustomization(user),
  };
}

export async function getFriendsOverview(userId: string): Promise<FriendsOverview> {
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: FRIEND_USER_SELECT },
      addressee: { select: FRIEND_USER_SELECT },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends: FriendEntry[] = [];
  const incoming: FriendRequestView[] = [];
  const outgoing: FriendRequestView[] = [];

  for (const row of rows) {
    const other = row.requesterId === userId ? row.addressee : row.requester;
    if (row.status === "ACCEPTED") {
      friends.push({ ...serializeFriendUser(other), friendshipId: row.id });
    } else if (row.addresseeId === userId) {
      incoming.push({
        friendshipId: row.id,
        user: serializeFriendUser(row.requester),
        createdAt: row.createdAt.toISOString(),
      });
    } else {
      outgoing.push({
        friendshipId: row.id,
        user: serializeFriendUser(row.addressee),
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  friends.sort((a, b) => a.nickname.localeCompare(b.nickname));
  return { friends, incoming, outgoing };
}

/** Find an existing friendship between two users regardless of direction. */
async function findEdge(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

export async function sendFriendRequest(
  userId: string,
  targetUserId: string,
): Promise<FriendRequestView> {
  if (userId === targetUserId) {
    throw new FriendError("Você não pode adicionar a si mesmo.", 400);
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: FRIEND_USER_SELECT,
  });
  if (!target) throw new FriendError("Jogador não encontrado.", 404);

  const existing = await findEdge(userId, targetUserId);
  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw new FriendError("Vocês já são amigos.");
    }
    // Pending request the other way -> accept it.
    if (existing.addresseeId === userId) {
      const accepted = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED" },
      });
      return {
        friendshipId: accepted.id,
        user: serializeFriendUser(target),
        createdAt: accepted.createdAt.toISOString(),
      };
    }
    throw new FriendError("Convite já enviado.");
  }

  const created = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: targetUserId, status: "PENDING" },
  });
  return {
    friendshipId: created.id,
    user: serializeFriendUser(target),
    createdAt: created.createdAt.toISOString(),
  };
}

export async function respondToRequest(
  userId: string,
  friendshipId: string,
  accept: boolean,
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== userId) {
    throw new FriendError("Convite não encontrado.", 404);
  }
  if (friendship.status === "ACCEPTED") {
    throw new FriendError("Convite já aceito.", 400);
  }
  if (accept) {
    await prisma.friendship.update({ where: { id: friendshipId }, data: { status: "ACCEPTED" } });
  } else {
    await prisma.friendship.delete({ where: { id: friendshipId } });
  }
}

export async function removeFriendship(userId: string, friendshipId: string): Promise<void> {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (
    !friendship ||
    (friendship.requesterId !== userId && friendship.addresseeId !== userId)
  ) {
    throw new FriendError("Amizade não encontrada.", 404);
  }
  await prisma.friendship.delete({ where: { id: friendshipId } });
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const edge = await findEdge(a, b);
  return edge?.status === "ACCEPTED";
}

export type SearchedUser = FriendUser & {
  relationship: "none" | "friends" | "incoming" | "outgoing";
};

export async function searchUsers(
  userId: string,
  query: string,
  limit = 12,
): Promise<SearchedUser[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      nickname: { contains: trimmed, mode: "insensitive" },
      id: { not: userId },
    },
    select: FRIEND_USER_SELECT,
    take: limit,
    orderBy: { nickname: "asc" },
  });

  if (users.length === 0) return [];

  const edges = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: { in: users.map((u) => u.id) } },
        { addresseeId: userId, requesterId: { in: users.map((u) => u.id) } },
      ],
    },
  });

  const edgeByUser = new Map<string, (typeof edges)[number]>();
  for (const edge of edges) {
    const other = edge.requesterId === userId ? edge.addresseeId : edge.requesterId;
    edgeByUser.set(other, edge);
  }

  return users.map((user) => {
    const edge = edgeByUser.get(user.id);
    let relationship: SearchedUser["relationship"] = "none";
    if (edge) {
      if (edge.status === "ACCEPTED") relationship = "friends";
      else if (edge.addresseeId === userId) relationship = "incoming";
      else relationship = "outgoing";
    }
    return { ...serializeFriendUser(user), relationship };
  });
}

export type SteamFriendsResult = {
  available: boolean;
  users: SearchedUser[];
};

/**
 * List the user's Steam friends who are registered on the platform.
 * Requires a linked Steam account, a public friends list and STEAM_API_KEY.
 */
export async function getSteamFriendsOnPlatform(
  userId: string,
): Promise<SteamFriendsResult> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!me?.steamId) {
    return { available: false, users: [] };
  }

  const friendSteamIds = await fetchSteamFriendIds(me.steamId);
  if (friendSteamIds.length === 0) {
    return { available: true, users: [] };
  }

  const users = await prisma.user.findMany({
    where: { steamId: { in: friendSteamIds }, id: { not: userId } },
    select: FRIEND_USER_SELECT,
    take: 100,
  });
  if (users.length === 0) {
    return { available: true, users: [] };
  }

  const edges = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: { in: users.map((u) => u.id) } },
        { addresseeId: userId, requesterId: { in: users.map((u) => u.id) } },
      ],
    },
  });
  const edgeByUser = new Map<string, (typeof edges)[number]>();
  for (const edge of edges) {
    const other = edge.requesterId === userId ? edge.addresseeId : edge.requesterId;
    edgeByUser.set(other, edge);
  }

  const result = users.map((user) => {
    const edge = edgeByUser.get(user.id);
    let relationship: SearchedUser["relationship"] = "none";
    if (edge) {
      if (edge.status === "ACCEPTED") relationship = "friends";
      else if (edge.addresseeId === userId) relationship = "incoming";
      else relationship = "outgoing";
    }
    return { ...serializeFriendUser(user), relationship };
  });

  return { available: true, users: result };
}
