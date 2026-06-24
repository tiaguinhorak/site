import "server-only";

import { getPlayerStickersForSync } from "@/lib/inventory/player-weapon-stickers";
import {
  getCsgoApiPushTargets,
  csgoBackendAuthHeaders,
} from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

const PRIMARY_TIMEOUT_MS = 5000;
const SECONDARY_TIMEOUT_MS = 2000;

async function pushStickersToTarget(
  baseUrl: string,
  payload: Awaited<ReturnType<typeof getPlayerStickersForSync>>,
  syncKey: string,
  timeoutMs: number,
): Promise<{ baseUrl: string; ok: boolean; error?: string }> {
  const url = `${baseUrl}/api/csgo/stickers/player-sync`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-skins-sync-key": syncKey,
        "Content-Type": "application/json",
        ...csgoBackendAuthHeaders(),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) return { baseUrl, ok: true };

    const text = await res.text().catch(() => "");
    return {
      baseUrl,
      ok: false,
      error: `Sticker sync HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sticker sync failed";
    return { baseUrl, ok: false, error: message };
  }
}

/** Primary ranked API awaited; warmup/extras run in background (no equip UI delay). */
export async function pushPlayerStickersToGameServer(
  steamId64: string,
): Promise<{ ok: boolean; error?: string }> {
  const syncKey = getSkinsSyncKey();
  if (!syncKey) {
    return { ok: false, error: "CSGO_SKINS_SYNC_KEY not configured" };
  }

  const payload = await getPlayerStickersForSync(steamId64);
  if (!payload.entries.length) {
    return { ok: true };
  }

  const targets = getCsgoApiPushTargets();
  if (targets.length === 0) {
    return { ok: false, error: "CSGO_API_URL not configured" };
  }

  const [primaryUrl, ...secondaryUrls] = targets;
  const primary = await pushStickersToTarget(
    primaryUrl,
    payload,
    syncKey,
    PRIMARY_TIMEOUT_MS,
  );

  if (secondaryUrls.length > 0) {
    void (async () => {
      for (const baseUrl of secondaryUrls) {
        const result = await pushStickersToTarget(
          baseUrl,
          payload,
          syncKey,
          SECONDARY_TIMEOUT_MS,
        );
        if (!result.ok) {
          console.warn(
            `[Clutch] background sticker push failed for ${result.baseUrl}: ${result.error ?? "unknown"}`,
          );
        }
      }
    })();
  }

  if (!primary.ok) {
    return { ok: false, error: primary.error };
  }

  return { ok: true };
}
