import "server-only";

import { invalidateCache } from "@/lib/csgo-api/request-cache";
import { syncCsgoPublicServersForce } from "@/lib/csgo-api/sync-public-servers";

export function invalidateCsgoRuntimeCaches() {
  invalidateCache("csgo:");
  invalidateCache("a2s:");
  invalidateCache("live-server-stats");
}

export async function afterCsgoServerMutation() {
  invalidateCsgoRuntimeCaches();
  await syncCsgoPublicServersForce();
}

export function afterCsgoMatchMutation() {
  invalidateCsgoRuntimeCaches();
}
