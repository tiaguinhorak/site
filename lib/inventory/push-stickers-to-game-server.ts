import "server-only";

import { getPlayerStickersForSync } from "@/lib/inventory/player-weapon-stickers";
import {
  getCsgoApiPushTargets,
  csgoBackendAuthHeaders,
} from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

const FETCH_TIMEOUT_MS = 8000;

async function pushStickersToTarget(
  baseUrl: string,
  payload: Awaited<ReturnType<typeof getPlayerStickersForSync>>,
  syncKey: string,
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
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

  const results = await Promise.all(
    targets.map((baseUrl) => pushStickersToTarget(baseUrl, payload, syncKey)),
  );

  const primary = results[0];
  const failed = results.filter((r) => !r.ok);

  for (const r of failed) {
    console.warn(
      `[Clutch] sticker push failed for ${r.baseUrl}: ${r.error ?? "unknown"}`,
    );
  }

  if (!primary?.ok) {
    return { ok: false, error: primary?.error ?? failed.map((r) => r.error).join("; ") };
  }

  return {
    ok: true,
    error:
      failed.length > 0
        ? `Partial: ${failed.map((r) => r.baseUrl).join(", ")} failed`
        : undefined,
  };
}
