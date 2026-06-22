import "server-only";

import { csgoBackendFetch, CsgoBackendError } from "@/lib/csgo-api/client";
import {
  ensureDefaultCsgoServerRegistered,
  getRankedServerBlockedMessage,
} from "@/lib/csgo-api/bootstrap-default-server";
import { queryCsgoServerLive } from "@/lib/csgo-api/query-live-server";
import { startCsgoServer } from "@/lib/csgo-api/server-control";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";

const bootstrappedSessions = new Set<string>();
const lastStartAttempt = new Map<string, number>();

const START_RETRY_MS = 5_000;

export function clearMatchServerBootstrap(sessionId: string) {
  bootstrappedSessions.delete(sessionId);
  lastStartAttempt.delete(sessionId);
}

export async function ensureCsgoServerAvailableForMatch(
  sessionId: string,
  map: string,
): Promise<{ ok: boolean; message: string }> {
  const bootstrap = await ensureDefaultCsgoServerRegistered();
  if (!bootstrap.ok) {
    return { ok: false, message: bootstrap.message };
  }

  const servers = await csgoBackendFetch<CsgoGameServer[]>("/api/servers");
  if (!servers.length) {
    return { ok: false, message: getRankedServerBlockedMessage() };
  }

  const server = servers[0]!;
  const live = await queryCsgoServerLive(server.host, server.port);
  if (live.online || server.status === "online") {
    return { ok: true, message: "Servidor disponível." };
  }

  if (bootstrappedSessions.has(sessionId)) {
    return {
      ok: false,
      message:
        "Servidor ainda offline. Suba em Admin → Infra CS:GO ou aguarde a retentativa automática.",
    };
  }

  bootstrappedSessions.add(sessionId);
  const result = await startCsgoServer(server.id, map);

  const after = await queryCsgoServerLive(server.host, server.port);
  if (result.ok || after.online) {
    return {
      ok: true,
      message: result.ok ? result.message : "Servidor detectado via query UDP.",
    };
  }

  return {
    ok: false,
    message: `${result.message} Use /admin/infra-csgo para subir o servidor manualmente.`,
  };
}

export async function attemptCsgoMatchStart(
  csgoMatchId: string,
  sessionId: string,
): Promise<string | null> {
  const now = Date.now();
  const last = lastStartAttempt.get(sessionId) ?? 0;
  if (now - last < START_RETRY_MS) return null;
  lastStartAttempt.set(sessionId, now);

  try {
    await csgoBackendFetch(`/api/matches/${csgoMatchId}/start`, {
      method: "POST",
      body: {},
    });
    return null;
  } catch (err) {
    if (err instanceof CsgoBackendError) return err.message;
    return "Falha ao iniciar partida no servidor.";
  }
}
