import "server-only";

import { getPlayerAgentsForSync } from "@/lib/inventory/player-agents";
import { ensureLegacyAgentCatalogAndLoadouts } from "@/lib/inventory/agent-catalog-admin";
import {
  getCsgoApiPushTargets,
  csgoBackendAuthHeaders,
} from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

const PRIMARY_TIMEOUT_MS = 30000;
const SECONDARY_TIMEOUT_MS = 15000;

async function pushAgentsToTarget(
  baseUrl: string,
  payload: Awaited<ReturnType<typeof getPlayerAgentsForSync>>,
  syncKey: string,
  timeoutMs: number,
): Promise<{ baseUrl: string; ok: boolean; error?: string }> {
  const url = `${baseUrl}/api/csgo/agents/player-sync`;

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

    if (res.ok) {
      return { baseUrl, ok: true };
    }

    const text = await res.text().catch(() => "");
    return {
      baseUrl,
      ok: false,
      error: `Agent sync HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent sync failed";
    return { baseUrl, ok: false, error: message };
  }
}

export async function pushPlayerAgentsToGameServer(
  steamId64: string,
): Promise<{ ok: boolean; error?: string }> {
  const syncKey = getSkinsSyncKey();
  if (!syncKey) {
    return { ok: false, error: "CSGO_SKINS_SYNC_KEY not configured" };
  }

  await ensureLegacyAgentCatalogAndLoadouts();
  const payload = await getPlayerAgentsForSync(steamId64);

  const targets = getCsgoApiPushTargets();
  if (targets.length === 0) {
    return { ok: false, error: "CSGO_API_URL not configured" };
  }

  const [primaryUrl, ...secondaryUrls] = targets;
  const primary = await pushAgentsToTarget(
    primaryUrl,
    payload,
    syncKey,
    PRIMARY_TIMEOUT_MS,
  );

  if (secondaryUrls.length > 0) {
    void (async () => {
      for (const baseUrl of secondaryUrls) {
        const result = await pushAgentsToTarget(
          baseUrl,
          payload,
          syncKey,
          SECONDARY_TIMEOUT_MS,
        );
        if (!result.ok) {
          console.warn(
            `[Clutch] background agent push failed for ${result.baseUrl}: ${result.error ?? "unknown"}`,
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
