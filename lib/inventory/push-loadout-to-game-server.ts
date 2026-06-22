import "server-only";

import { exportAllPlayerSkins } from "@/lib/csgo-api/services/skins";
import { getCsgoApiBaseUrl, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

/**
 * Writes clutch_skins.txt on the CS VPS (via api-csgo) and triggers sm_reloadclutchskins.
 * Fire-and-forget after equip/unequip on the site.
 */
export async function pushLoadoutToGameServer(): Promise<{ ok: boolean; error?: string }> {
  const syncKey = getSkinsSyncKey();
  if (!syncKey) {
    return { ok: false, error: "CSGO_SKINS_SYNC_KEY not configured" };
  }

  try {
    const body = await exportAllPlayerSkins();
    const url = `${getCsgoApiBaseUrl()}/api/csgo/skins/push`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-skins-sync-key": syncKey,
        "Content-Type": "text/plain; charset=utf-8",
        ...csgoBackendAuthHeaders(),
      },
      body,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Push failed HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "push failed";
    console.error("[Clutch] pushLoadoutToGameServer:", message);
    return { ok: false, error: message };
  }
}

export function schedulePushLoadoutToGameServer(): void {
  void pushLoadoutToGameServer();
}
