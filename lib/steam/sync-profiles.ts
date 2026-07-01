import "server-only";

import type { User } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchSteamPlayerSummaries } from "@/lib/steam/profile";
import { normalizeSteamId64 } from "@/lib/steam/steam-id";
import { buildUserSteamUpdate } from "@/lib/steam/sync-user";

const STEAM_USER_SELECT = {
  id: true,
  steamId: true,
  avatarUrl: true,
  avatarPreset: true,
  steamAvatarUrl: true,
  steamPersonaName: true,
  firstName: true,
  lastName: true,
  country: true,
} satisfies Record<string, boolean>;

type SteamUserRow = Pick<
  User,
  | "id"
  | "steamId"
  | "avatarUrl"
  | "avatarPreset"
  | "steamAvatarUrl"
  | "steamPersonaName"
  | "firstName"
  | "lastName"
  | "country"
>;

const FALLBACK_PERSONA = /^Player_\d{4}$/;

export function userNeedsSteamProfileRefresh(
  user: Pick<User, "steamId" | "steamPersonaName" | "steamAvatarUrl">,
): boolean {
  if (!user.steamId) return false;
  if (!user.steamPersonaName || !user.steamAvatarUrl) return true;
  if (FALLBACK_PERSONA.test(user.steamPersonaName)) return true;
  return false;
}

export async function refreshSteamProfileForUserId(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: STEAM_USER_SELECT,
  });
  if (!user?.steamId) return false;
  return refreshSteamProfileForUser(user);
}

export async function refreshSteamProfileForUser(user: SteamUserRow): Promise<boolean> {
  if (!user.steamId) return false;

  const steamId = normalizeSteamId64(user.steamId) ?? user.steamId;
  const profiles = await fetchSteamPlayerSummaries([steamId]);
  const profile = profiles.get(steamId) ?? profiles.get(user.steamId);
  if (!profile) return false;

  await prisma.user.update({
    where: { id: user.id },
    data: buildUserSteamUpdate(user, profile),
  });
  return true;
}

export type SteamProfileSyncResult = {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
};

export async function refreshAllLinkedSteamProfiles(options?: {
  limit?: number;
  userIds?: string[];
}): Promise<SteamProfileSyncResult> {
  const limit = options?.limit ?? 500;
  const users = await prisma.user.findMany({
    where: {
      steamId: { not: null },
      ...(options?.userIds?.length ? { id: { in: options.userIds } } : {}),
    },
    select: STEAM_USER_SELECT,
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  const result: SteamProfileSyncResult = {
    total: users.length,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  if (users.length === 0) return result;

  const steamIds = users
    .map((user) => (user.steamId ? normalizeSteamId64(user.steamId) ?? user.steamId : null))
    .filter((id): id is string => Boolean(id));

  const profiles = await fetchSteamPlayerSummaries(steamIds);

  for (const user of users) {
    if (!user.steamId) {
      result.skipped += 1;
      continue;
    }

    const steamId = normalizeSteamId64(user.steamId) ?? user.steamId;
    const profile = profiles.get(steamId) ?? profiles.get(user.steamId);
    if (!profile) {
      result.failed += 1;
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: buildUserSteamUpdate(user, profile),
    });
    result.updated += 1;
  }

  return result;
}
