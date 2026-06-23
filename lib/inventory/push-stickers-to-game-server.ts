import "server-only";

import { getPlayerStickersForSync } from "@/lib/inventory/player-weapon-stickers";
import { getCsgoApiBaseUrl, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

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

  const url = `${getCsgoApiBaseUrl()}/api/csgo/stickers/player-sync`;

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
    });

    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    return { ok: false, error: `Sticker sync HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sticker sync failed";
    return { ok: false, error: message };
  }
}
