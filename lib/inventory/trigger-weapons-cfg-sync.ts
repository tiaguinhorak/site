import "server-only";

import { getCsgoApiBaseUrl, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

/** Push enabled catalog skins to VPS weapons_english.cfg (admin-added paintkits). */
export async function triggerWeaponsCfgSyncOnVps(): Promise<void> {
  const syncKey = getSkinsSyncKey();
  if (!syncKey) return;

  const url = `${getCsgoApiBaseUrl()}/api/csgo/skins/sync-weapons-cfg`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-skins-sync-key": syncKey,
        "Content-Type": "application/json",
        ...csgoBackendAuthHeaders(),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        "[Clutch] weapons cfg sync HTTP",
        res.status,
        text.slice(0, 160),
      );
    }
  } catch (err) {
    console.warn("[Clutch] weapons cfg sync failed:", err);
  }
}
