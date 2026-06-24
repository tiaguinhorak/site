import "server-only";

import { getPlayerLoadoutForSync } from "@/lib/csgo-api/services/skins";
import { isMeleeWeaponId } from "@/lib/inventory/equip-slot-rules";
import { pushPlayerStickersToGameServer } from "@/lib/inventory/push-stickers-to-game-server";
import {
  getCsgoApiPushTargets,
  csgoBackendAuthHeaders,
} from "@/lib/csgo-api/config";
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

type TargetPushResult = {
  baseUrl: string;
  ok: boolean;
  error?: string;
  applyMode?: "staged" | "immediate";
};

async function pushLoadoutToTarget(
  baseUrl: string,
  body: Record<string, unknown>,
  syncKey: string,
): Promise<TargetPushResult> {
  const url = `${baseUrl}/api/csgo/skins/player-sync`;

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
        const bodyText = await res.text().catch(() => "");
        let applyMode: "staged" | "immediate" = "staged";
        try {
          const data = JSON.parse(bodyText) as { applyMode?: string };
          if (data.applyMode === "immediate") {
            applyMode = "immediate";
          }
        } catch {
          // non-json body — default staged
        }
        return { baseUrl, ok: true, applyMode };
      }

      const text = await res.text().catch(() => "");
      const error = `Player sync HTTP ${res.status}: ${text.slice(0, 200)}`;

      if (attempt < MAX_ATTEMPTS && res.status >= 500) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      console.error(`[Clutch] pushPlayerLoadoutToGameServer (${baseUrl}):`, error);
      return { baseUrl, ok: false, error };
    } catch (err) {
      const message = err instanceof Error ? err.message : "player sync failed";
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      console.error(`[Clutch] pushPlayerLoadoutToGameServer (${baseUrl}):`, message);
      return { baseUrl, ok: false, error: message };
    }
  }

  return { baseUrl, ok: false, error: "player sync failed after retries" };
}

/**
 * Syncs one player's equipped loadout to every configured CS VPS (ranked + warmup)
 * and triggers sm_clutch_loadout_pending / applyskins on each — no clutch_skins.txt file.
 */
export async function pushPlayerLoadoutToGameServer(
  steamId64: string,
  options?: PushLoadoutOptions,
): Promise<{ ok: boolean; error?: string; applyMode?: "staged" | "immediate" }> {
  const syncKey = getSkinsSyncKey();
  if (!syncKey) {
    return { ok: false, error: "CSGO_SKINS_SYNC_KEY not configured" };
  }

  const targets = getCsgoApiPushTargets();
  if (targets.length === 0) {
    return { ok: false, error: "CSGO_API_URL not configured" };
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

  const results = await Promise.all(
    targets.map((baseUrl) => pushLoadoutToTarget(baseUrl, body, syncKey)),
  );

  const primary = results[0];
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    for (const r of failed) {
      console.warn(
        `[Clutch] loadout push failed for ${r.baseUrl}: ${r.error ?? "unknown"}`,
      );
    }
  }

  if (!primary?.ok) {
    return {
      ok: false,
      error: primary?.error ?? failed.map((r) => r.error).join("; "),
    };
  }

  const stickerResult = await pushPlayerStickersToGameServer(steamId64);
  if (!stickerResult.ok) {
    console.warn("[Clutch] pushPlayerStickersToGameServer:", stickerResult.error);
  }

  return {
    ok: true,
    applyMode: primary.applyMode,
    error:
      failed.length > 0
        ? `Partial: ${failed.map((r) => r.baseUrl).join(", ")} failed`
        : undefined,
  };
}

export function schedulePushPlayerLoadoutToGameServer(
  steamId64: string,
  options?: PushLoadoutOptions,
): void {
  void pushPlayerLoadoutToGameServer(steamId64, options);
}
