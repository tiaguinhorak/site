import "server-only";

import { csgoBackendFetchAt } from "@/lib/csgo-api/client";
import { getCsgoApiPushTargets } from "@/lib/csgo-api/config";

export type GameServerBanResult = {
  ok: boolean;
  error?: string;
  details?: Array<{ baseUrl: string; ok: boolean; error?: string }>;
};

export function punishmentDurationToBanMinutes(expiresAt: Date | null): number {
  if (!expiresAt) return 0;
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return 1;
  return Math.max(1, Math.ceil(diffMs / 60_000));
}

export async function banPlayerOnGameServers(input: {
  steamId: string;
  minutes: number;
  reason: string;
}): Promise<GameServerBanResult> {
  const targets = getCsgoApiPushTargets();
  if (targets.length === 0) {
    return { ok: false, error: "CSGO_API_URL não configurado." };
  }

  const details: Array<{ baseUrl: string; ok: boolean; error?: string }> = [];

  for (const baseUrl of targets) {
    try {
      const result = await csgoBackendFetchAt<{ ok: boolean }>(
        "/api/csgo/players/ban",
        baseUrl,
        {
          method: "POST",
          body: input,
          timeoutMs: 12_000,
        },
      );
      details.push({ baseUrl, ok: Boolean(result.ok) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      details.push({ baseUrl, ok: false, error: message });
    }
  }

  const ok = details.some((entry) => entry.ok);
  return {
    ok,
    error: ok ? undefined : "Falha ao banir no servidor de jogo.",
    details,
  };
}

export async function unbanPlayerOnGameServers(steamId: string): Promise<GameServerBanResult> {
  const targets = getCsgoApiPushTargets();
  if (targets.length === 0) {
    return { ok: false, error: "CSGO_API_URL não configurado." };
  }

  const details: Array<{ baseUrl: string; ok: boolean; error?: string }> = [];

  for (const baseUrl of targets) {
    try {
      const result = await csgoBackendFetchAt<{ ok: boolean }>(
        "/api/csgo/players/unban",
        baseUrl,
        {
          method: "POST",
          body: { steamId },
          timeoutMs: 12_000,
        },
      );
      details.push({ baseUrl, ok: Boolean(result.ok) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      details.push({ baseUrl, ok: false, error: message });
    }
  }

  const ok = details.some((entry) => entry.ok);
  return {
    ok,
    error: ok ? undefined : "Falha ao remover ban no servidor de jogo.",
    details,
  };
}
