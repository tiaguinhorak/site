import "server-only";

import { CsgoBackendError, csgoBackendFetch } from "@/lib/csgo-api/client";
import {
  ensureAllDefaultCsgoServersRegistered,
  getRankedServerBlockedMessage,
} from "@/lib/csgo-api/bootstrap-default-server";
import {
  pickBestServerForMatch,
  verifyServerReachable,
} from "@/lib/csgo-api/server-allocation";
import { startCsgoServer } from "@/lib/csgo-api/server-control";

const bootstrappedSessions = new Set<string>();
const sessionServerIds = new Map<string, string>();
const lastStartAttempt = new Map<string, number>();

const START_RETRY_MS = 5_000;

export function clearMatchServerBootstrap(sessionId: string) {
  bootstrappedSessions.delete(sessionId);
  sessionServerIds.delete(sessionId);
  lastStartAttempt.delete(sessionId);
}

export function getSessionAllocatedServerId(sessionId: string): string | undefined {
  return sessionServerIds.get(sessionId);
}

export async function ensureCsgoServerAvailableForMatch(
  sessionId: string,
  map: string,
): Promise<{ ok: boolean; message: string; serverId?: string }> {
  const bootstrap = await ensureAllDefaultCsgoServersRegistered();
  if (!bootstrap.ok) {
    return { ok: false, message: bootstrap.message };
  }

  const preferredId = sessionServerIds.get(sessionId);
  const server = await pickBestServerForMatch(preferredId);
  if (!server) {
    return {
      ok: false,
      message:
        "Todos os servidores estão ocupados com outra partida. Aguarde ou adicione mais instâncias em Admin → Infra CS:GO.",
    };
  }

  sessionServerIds.set(sessionId, server.id);

  const reachable = await verifyServerReachable(server);
  if (reachable) {
    return {
      ok: true,
      message: `Servidor ${server.name} disponível.`,
      serverId: server.id,
    };
  }

  if (bootstrappedSessions.has(sessionId)) {
    return {
      ok: false,
      message:
        `Servidor ${server.name} ainda offline. Suba em Admin → Infra CS:GO ou aguarde a retentativa automática.`,
      serverId: server.id,
    };
  }

  bootstrappedSessions.add(sessionId);
  const result = await startCsgoServer(server.id, map);

  const after = await verifyServerReachable(server);
  if (result.ok || after) {
    return {
      ok: true,
      message: result.ok ? result.message : "Servidor detectado via query UDP.",
      serverId: server.id,
    };
  }

  return {
    ok: false,
    message: `${result.message} Use Admin → Infra CS:GO para subir ${server.name} manualmente.`,
    serverId: server.id,
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

  const serverId = sessionServerIds.get(sessionId);
  if (!serverId) {
    return "Nenhum servidor reservado para esta partida. Aguarde o boot automático.";
  }

  try {
    await csgoBackendFetch(`/api/matches/${csgoMatchId}/start`, {
      method: "POST",
      body: { serverId },
    });
    return null;
  } catch (err) {
    if (err instanceof CsgoBackendError) return err.message;
    return "Falha ao iniciar partida no servidor.";
  }
}
