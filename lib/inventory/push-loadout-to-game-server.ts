import "server-only";

import { getPlayerLoadoutForSync } from "@/lib/csgo-api/services/skins";
import { isMeleeWeaponId } from "@/lib/inventory/equip-slot-rules";
import { pushPlayerStickersToGameServer } from "@/lib/inventory/push-stickers-to-game-server";
import { getCsgoApiBaseUrl, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PushLoadoutOptions = {
  clearWeaponIds?: string[];
  clearGloveTeam?: "T" | "CT";
};

/**
 * Syncs one player's equipped loadout to the CS VPS weapons SQLite (via api-csgo)
 * and triggers sm_clutch_applyskins — no clutch_skins.txt file.
 */
export async function pushPlayerLoadoutToGameServer(
  steamId64: string,
  options?: PushLoadoutOptions,
): Promise<{ ok: boolean; error?: string }> {
  const syncKey = getSkinsSyncKey();
  if (!syncKey) {
    return { ok: false, error: "CSGO_SKINS_SYNC_KEY not configured" };
  }

  const payload = await getPlayerLoadoutForSync(steamId64);
  const clearWeaponIds = options?.clearWeaponIds ?? [];
  const clearKnifeSlot =
    clearWeaponIds.some((id) => isMeleeWeaponId(id)) ||
    payload.weapons.some((w) => isMeleeWeaponId(w.weaponId));

  const body = {
    ...payload,
    clearKnifeSlot,
    clearWeaponIds,
    clearGloveTeam: options?.clearGloveTeam,
  };

  const url = `${getCsgoApiBaseUrl()}/api/csgo/skins/player-sync`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-skins-sync-key": syncKey,
          "Content-Type": "application/json",
          ...csgoBackendAuthHeaders(),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (res.ok) {
        const stickerResult = await pushPlayerStickersToGameServer(steamId64);
        if (!stickerResult.ok) {
          console.warn("[Clutch] pushPlayerStickersToGameServer:", stickerResult.error);
        }
        return { ok: true };
      }

      const text = await res.text().catch(() => "");
      const error = `Player sync HTTP ${res.status}: ${text.slice(0, 200)}`;

      if (attempt < MAX_ATTEMPTS && res.status >= 500) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      console.error("[Clutch] pushPlayerLoadoutToGameServer:", error);
      return { ok: false, error };
    } catch (err) {
      const message = err instanceof Error ? err.message : "player sync failed";
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      console.error("[Clutch] pushPlayerLoadoutToGameServer:", message);
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: "player sync failed after retries" };
}

export function schedulePushPlayerLoadoutToGameServer(
  steamId64: string,
  options?: PushLoadoutOptions,
): void {
  void pushPlayerLoadoutToGameServer(steamId64, options);
}
