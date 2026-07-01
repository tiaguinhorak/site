import "server-only";

import { throttled } from "@/lib/csgo-api/request-cache";
import { prisma } from "@/lib/prisma";
import { hasSteamApiKey } from "@/lib/steam/api-key";
import { refreshAllLinkedSteamProfiles } from "@/lib/steam/sync-profiles-core";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 15_000;
const BATCH_SIZE = 100;

let started = false;

async function runGlobalSteamSync(): Promise<void> {
  if (!hasSteamApiKey()) return;

  const result = await refreshAllLinkedSteamProfiles(prisma, { limit: BATCH_SIZE });
  if (result.updated > 0) {
    console.log(
      `[steam/sync] ${result.updated}/${result.total} perfil(is) Steam atualizado(s)`,
    );
  } else if (result.failed > 0 && result.apiError) {
    console.warn(`[steam/sync] falhou: ${result.apiError}`);
  }
}

/** Throttled — safe to call from any server route. */
export function syncStaleSteamProfilesBackground(): void {
  if (!hasSteamApiKey()) return;
  void throttled("steam-profile-sync", SYNC_INTERVAL_MS, runGlobalSteamSync);
}

export function startSteamProfileBackgroundSync(): void {
  if (started) return;
  if (process.env.NODE_ENV === "test") return;
  started = true;

  if (!hasSteamApiKey()) {
    console.warn("[steam/sync] STEAM_API_KEY ausente — sync automático desativado");
    return;
  }

  setTimeout(() => {
    void runGlobalSteamSync().catch((error) => {
      console.error("[steam/sync] startup sync failed:", error);
    });
  }, STARTUP_DELAY_MS);

  setInterval(() => {
    syncStaleSteamProfilesBackground();
  }, SYNC_INTERVAL_MS);

  console.log("[steam/sync] sync global de nomes/fotos Steam ativo (5 min)");
}
