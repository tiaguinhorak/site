import "server-only";

import {
  getCsgoApiPushTargets,
  csgoBackendAuthHeaders,
} from "@/lib/csgo-api/config";
import { getSkinsSyncKey } from "@/lib/env/skins-sync";

export type GameServerReachability = {
  configured: boolean;
  reachable: boolean;
  target?: string;
  hint?: string;
};

function maskPushTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === "https:" ? "443" : "80")}`;
  } catch {
    return url.replace(/\/$/, "");
  }
}

/** Dev UI: is CSGO_API_URL set and does ranked api-csgo /health respond? */
export async function checkGameServerReachability(): Promise<GameServerReachability> {
  const targets = getCsgoApiPushTargets();
  if (targets.length === 0) {
    return {
      configured: false,
      reachable: false,
      hint:
        "Defina CSGO_API_URL no .env do site (ex.: http://188.220.168.233:3001) para enviar skins/stickers à VPS.",
    };
  }

  const primary = targets[0];
  const masked = maskPushTarget(primary);

  if (!getSkinsSyncKey()) {
    return {
      configured: true,
      reachable: false,
      target: masked,
      hint: "CSGO_SKINS_SYNC_KEY ausente no .env do site (deve ser igual ao da VPS).",
    };
  }

  try {
    const res = await fetch(`${primary}/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: csgoBackendAuthHeaders(),
    });
    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        target: masked,
        hint: `API respondeu HTTP ${res.status}. Confira firewall :3001 e pm2 na VPS.`,
      };
    }
    return { configured: true, reachable: true, target: masked };
  } catch (err) {
    const message = err instanceof Error ? err.message : "connection failed";
    return {
      configured: true,
      reachable: false,
      target: masked,
      hint: `Não alcançou a VPS (${message}). Abra porta 3001 e use o IP público em CSGO_API_URL.`,
    };
  }
}
