import "server-only";

import { prisma } from "@/lib/prisma";
import {
  refreshAllLinkedSteamProfiles as refreshAllLinkedSteamProfilesCore,
  refreshStaleSteamProfiles as refreshStaleSteamProfilesCore,
  refreshSteamProfileForUser as refreshSteamProfileForUserCore,
  refreshSteamProfileForUserId as refreshSteamProfileForUserIdCore,
  userNeedsSteamProfileRefresh,
  type SteamProfileSyncResult,
} from "@/lib/steam/sync-profiles-core";

export { userNeedsSteamProfileRefresh, type SteamProfileSyncResult };

const userRefreshAt = new Map<string, number>();
const USER_REFRESH_MS = 10 * 60 * 1000;

/** Atualiza perfil Steam do usuário no máximo 1x a cada 10 min (login, dashboard, etc.). */
export async function refreshSteamProfileIfDue(userId: string): Promise<boolean> {
  const now = Date.now();
  const last = userRefreshAt.get(userId) ?? 0;
  if (now - last < USER_REFRESH_MS) return false;
  userRefreshAt.set(userId, now);
  return refreshSteamProfileForUserId(userId);
}

export async function refreshSteamProfileForUserId(userId: string): Promise<boolean> {
  return refreshSteamProfileForUserIdCore(prisma, userId);
}

export async function refreshSteamProfileForUser(
  user: Parameters<typeof refreshSteamProfileForUserCore>[1],
): Promise<boolean> {
  return refreshSteamProfileForUserCore(prisma, user);
}

export async function refreshStaleSteamProfiles(limit = 50): Promise<SteamProfileSyncResult> {
  return refreshStaleSteamProfilesCore(prisma, limit);
}

export async function refreshAllLinkedSteamProfiles(options?: {
  limit?: number;
  userIds?: string[];
}): Promise<SteamProfileSyncResult> {
  return refreshAllLinkedSteamProfilesCore(prisma, options);
}
