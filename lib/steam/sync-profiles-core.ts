import type { PrismaClient, User } from "@/lib/generated/prisma/client";
import { fetchSteamPlayerSummariesWithMeta } from "@/lib/steam/profile";
import { isSteamId64, normalizeSteamId64 } from "@/lib/steam/steam-id";
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
} as const;

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

function resolveApiSteamId(steamId: string | null | undefined): string | null {
  if (!steamId?.trim()) return null;
  const trimmed = steamId.trim();
  return normalizeSteamId64(trimmed) ?? (isSteamId64(trimmed) ? trimmed : null);
}

export function userNeedsSteamProfileRefresh(
  user: Pick<User, "steamId" | "steamPersonaName" | "steamAvatarUrl">,
): boolean {
  if (!user.steamId) return false;
  if (!user.steamPersonaName || !user.steamAvatarUrl) return true;
  if (FALLBACK_PERSONA.test(user.steamPersonaName)) return true;
  return false;
}

export async function refreshSteamProfileForUserId(
  prisma: PrismaClient,
  userId: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: STEAM_USER_SELECT,
  });
  if (!user?.steamId) return false;
  return refreshSteamProfileForUser(prisma, user);
}

export async function refreshSteamProfileForUser(
  prisma: PrismaClient,
  user: SteamUserRow,
): Promise<boolean> {
  const steamId = resolveApiSteamId(user.steamId);
  if (!steamId) return false;

  const { profiles } = await fetchSteamPlayerSummariesWithMeta([steamId]);
  const profile = profiles.get(steamId) ?? (user.steamId ? profiles.get(user.steamId) : undefined);
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
  invalidSteamId: number;
  apiHttpStatus: number | null;
  apiError: string | null;
};

export async function refreshAllLinkedSteamProfiles(
  prisma: PrismaClient,
  options?: {
    limit?: number;
    userIds?: string[];
  },
): Promise<SteamProfileSyncResult> {
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
    invalidSteamId: 0,
    apiHttpStatus: null,
    apiError: null,
  };

  if (users.length === 0) return result;

  const usersWithValidSteamId: Array<SteamUserRow & { apiSteamId: string }> = [];

  for (const user of users) {
    const apiSteamId = resolveApiSteamId(user.steamId);
    if (!apiSteamId) {
      result.invalidSteamId += 1;
      result.failed += 1;
      continue;
    }
    usersWithValidSteamId.push({ ...user, apiSteamId });
  }

  if (usersWithValidSteamId.length === 0) {
    result.apiError = "Nenhum steamId válido (SteamID64) no banco.";
    return result;
  }

  const steamIds = [...new Set(usersWithValidSteamId.map((user) => user.apiSteamId))];
  const { profiles, meta } = await fetchSteamPlayerSummariesWithMeta(steamIds);
  result.apiHttpStatus = meta.httpStatus;
  result.apiError = meta.error;

  if (profiles.size === 0 && meta.error) {
    result.failed += usersWithValidSteamId.length;
    return result;
  }

  for (const user of usersWithValidSteamId) {
    const profile =
      profiles.get(user.apiSteamId) ??
      (user.steamId ? profiles.get(user.steamId) : undefined);
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
