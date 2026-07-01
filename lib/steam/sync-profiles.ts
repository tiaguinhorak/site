import "server-only";

import { prisma } from "@/lib/prisma";
import {
  refreshAllLinkedSteamProfiles as refreshAllLinkedSteamProfilesCore,
  refreshSteamProfileForUser as refreshSteamProfileForUserCore,
  refreshSteamProfileForUserId as refreshSteamProfileForUserIdCore,
  userNeedsSteamProfileRefresh,
  type SteamProfileSyncResult,
} from "@/lib/steam/sync-profiles-core";

export { userNeedsSteamProfileRefresh, type SteamProfileSyncResult };

export async function refreshSteamProfileForUserId(userId: string): Promise<boolean> {
  return refreshSteamProfileForUserIdCore(prisma, userId);
}

export async function refreshSteamProfileForUser(
  user: Parameters<typeof refreshSteamProfileForUserCore>[1],
): Promise<boolean> {
  return refreshSteamProfileForUserCore(prisma, user);
}

export async function refreshAllLinkedSteamProfiles(options?: {
  limit?: number;
  userIds?: string[];
}): Promise<SteamProfileSyncResult> {
  return refreshAllLinkedSteamProfilesCore(prisma, options);
}
