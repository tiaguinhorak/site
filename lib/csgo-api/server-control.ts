import "server-only";

import { csgoBackendFetch, CsgoBackendError } from "@/lib/csgo-api/client";
import { orphanCsgoProcessHelp } from "@/lib/csgo-api/orphan-process-help";
import { queryCsgoServerLive, refreshCsgoServerLive } from "@/lib/csgo-api/query-live-server";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";
import { formatMapLabel } from "@/lib/servers/maps";

const POLL_MS = 2_000;
const STOP_TIMEOUT_MS = 30_000;
const STOP_QUICK_CHECK_MS = 5_000;
const STOP_RETRY_DELAY_MS = 4_000;
const START_TIMEOUT_MS = 90_000;
const MAP_VERIFY_DELAY_MS = 4_000;
const RCON_QUIT_COMMANDS = ["quit", "_quit"] as const;

export type ServerControlResult = {
  ok: boolean;
  message: string;
  warning?: string;
  server?: CsgoGameServer;
  actualMap?: string | null;
  expectedMap?: string;
  orphanProcess?: boolean;
};

export type RegisterCsgoServerInput = {
  name: string;
  host: string;
  port: number;
  rconPort: number;
  rconPassword: string;
  csgoDir: string;
  tickrate?: number;
  pool?: "ranked" | "warmup" | "public";
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMapId(map: string | null | undefined): string {
  if (!map) return "";
  return map.toLowerCase().replace(/^de_/, "");
}

function mapsMatch(actual: string | null | undefined, expected: string): boolean {
  return normalizeMapId(actual) === normalizeMapId(expected);
}

async function getServer(serverId: string): Promise<CsgoGameServer> {
  return csgoBackendFetch<CsgoGameServer>(`/api/servers/${serverId}`);
}

async function syncServerApiStatus(serverId: string): Promise<CsgoGameServer> {
  try {
    return await csgoBackendFetch<CsgoGameServer>(`/api/servers/${serverId}/status`);
  } catch {
    return getServer(serverId);
  }
}

function isRconConnectionRefused(message: string): boolean {
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT/i.test(message);
}

function rconTcpHint(server: CsgoGameServer): string {
  return (
    `RCON TCP não responde em ${server.host}:${server.rconPort ?? server.port} ` +
    `(o jogo aparece online na query UDP, mas RCON precisa de -usercon +rcon_password no start). ` +
    `Use Derrubar → Iniciar no admin para reiniciar com RCON.`
  );
}

async function waitUntilOffline(host: string, port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const live = await refreshCsgoServerLive(host, port);
    if (!live.online) return true;
    await sleep(POLL_MS);
  }
  return false;
}

async function waitUntilOnline(host: string, port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const live = await refreshCsgoServerLive(host, port);
    if (live.online) return true;
    await sleep(POLL_MS);
  }
  return false;
}

async function verifyMap(host: string, port: number, expectedMap: string) {
  await sleep(MAP_VERIFY_DELAY_MS);
  const live = await refreshCsgoServerLive(host, port);
  const matched = live.online && mapsMatch(live.mapRaw, expectedMap);
  return {
    live,
    matched,
    actualMap: live.mapRaw,
    actualMapLabel: formatMapLabel(live.mapRaw),
  };
}

function mapMismatchWarning(expectedMap: string, actualMap: string | null): string {
  return `Servidor respondeu, mas o mapa continua ${formatMapLabel(actualMap)} em vez de ${formatMapLabel(expectedMap)}. Verifique RCON/senha na API CS:GO da VPS.`;
}

async function tryRconShutdown(serverId: string, host: string, port: number): Promise<boolean> {
  for (const command of RCON_QUIT_COMMANDS) {
    try {
      await csgoBackendFetch(`/api/servers/${serverId}/rcon`, {
        method: "POST",
        body: { command },
      });
      await sleep(3_000);
      const live = await refreshCsgoServerLive(host, port);
      if (!live.online) return true;
    } catch {
      /* RCON indisponível */
    }
  }
  return false;
}

async function invokeApiStop(serverId: string): Promise<CsgoGameServer> {
  return csgoBackendFetch<CsgoGameServer>(`/api/servers/${serverId}/stop`, {
    method: "POST",
  });
}

function buildOrphanFailure(
  server: CsgoGameServer,
  liveMap: string | null,
  opts?: { message?: string; hint?: string },
): ServerControlResult {
  return {
    ok: false,
    orphanProcess: true,
    message:
      opts?.message ??
      "A API marcou o servidor como parado, mas o jogo ainda responde na porta — processo órfão (fora do screen da API).",
    warning: [opts?.hint, orphanCsgoProcessHelp(server.port, server.screenSession)]
      .filter(Boolean)
      .join(" "),
    server,
    actualMap: liveMap,
  };
}

async function tryRconChangeMap(
  serverId: string,
  server: CsgoGameServer,
  map: string,
): Promise<ServerControlResult> {
  try {
    await csgoBackendFetch(`/api/servers/${serverId}/rcon`, {
      method: "POST",
      body: { command: `changelevel ${map}` },
    });
    const verify = await verifyMap(server.host, server.port, map);
    if (verify.matched) {
      return {
        ok: true,
        message: `Mapa alterado para ${formatMapLabel(map)} via RCON.`,
        server,
        expectedMap: map,
        actualMap: verify.actualMap,
      };
    }
    return {
      ok: false,
      message: "RCON respondeu, mas o mapa não mudou dentro do tempo esperado.",
      warning: mapMismatchWarning(map, verify.actualMap),
      server,
      expectedMap: map,
      actualMap: verify.actualMap,
    };
  } catch (err) {
    const detail = err instanceof CsgoBackendError ? err.message : "RCON indisponível.";
    return {
      ok: false,
      message: detail,
      warning: isRconConnectionRefused(detail)
        ? rconTcpHint(server)
        : "Verifique CSGO_RCON_PASSWORD e CSGO_RCON_PORT.",
      server,
    };
  }
}

export async function startCsgoServer(
  serverId: string,
  map: string,
  options?: { afterStop?: boolean },
): Promise<ServerControlResult> {
  const before = await getServer(serverId);
  const liveBefore = await queryCsgoServerLive(before.host, before.port);

  if (liveBefore.online && !options?.afterStop) {
    return {
      ok: false,
      message: "Servidor já está online. Use trocar mapa ou derrube antes de subir novamente.",
      server: before,
      actualMap: liveBefore.mapRaw,
    };
  }

  try {
    const server = await csgoBackendFetch<CsgoGameServer>(`/api/servers/${serverId}/start`, {
      method: "POST",
      body: { map },
    });

    const online = await waitUntilOnline(server.host, server.port, START_TIMEOUT_MS);
    if (!online) {
      return {
        ok: false,
        message: "Comando enviado, mas o servidor não respondeu à query dentro do tempo esperado.",
        server,
        expectedMap: map,
      };
    }

    const verify = await verifyMap(server.host, server.port, map);
    if (!verify.matched) {
      return {
        ok: true,
        message: `Servidor online em ${server.host}:${server.port}.`,
        warning: mapMismatchWarning(map, verify.actualMap),
        server,
        expectedMap: map,
        actualMap: verify.actualMap,
      };
    }

    return {
      ok: true,
      message: `Servidor online em ${formatMapLabel(map)} (${server.host}:${server.port}).`,
      server,
      expectedMap: map,
      actualMap: verify.actualMap,
    };
  } catch (err) {
    const message = err instanceof CsgoBackendError ? err.message : "Falha ao iniciar servidor.";
    return { ok: false, message };
  }
}

export async function stopCsgoServer(serverId: string): Promise<ServerControlResult> {
  const before = await getServer(serverId);
  const liveBefore = await refreshCsgoServerLive(before.host, before.port);

  if (!liveBefore.online) {
    return {
      ok: true,
      message: `Servidor ${before.name} já está offline.`,
      server: before,
    };
  }

  try {
    if (await tryRconShutdown(serverId, before.host, before.port)) {
      const server = await getServer(serverId);
      return {
        ok: true,
        message: `Servidor ${before.name} encerrado via RCON.`,
        server,
      };
    }

    let server = await invokeApiStop(serverId);
    await sleep(STOP_QUICK_CHECK_MS);
    let live = await refreshCsgoServerLive(server.host, server.port);
    if (!live.online) {
      return {
        ok: true,
        message: `Servidor ${before.name} derrubado.`,
        server: await getServer(serverId),
      };
    }

    server = await getServer(serverId);
    if (server.status === "offline") {
      if (await tryRconShutdown(serverId, server.host, server.port)) {
        return {
          ok: true,
          message: `Servidor ${before.name} encerrado via RCON.`,
          server: await getServer(serverId),
        };
      }
      return buildOrphanFailure(server, live.mapRaw);
    }

    await sleep(STOP_RETRY_DELAY_MS);
    server = await invokeApiStop(serverId);
    const offline = await waitUntilOffline(
      server.host,
      server.port,
      STOP_TIMEOUT_MS - STOP_QUICK_CHECK_MS,
    );
    live = await refreshCsgoServerLive(server.host, server.port);
    if (!offline && live.online) {
      return buildOrphanFailure(await getServer(serverId), live.mapRaw);
    }

    return {
      ok: true,
      message: `Servidor ${before.name} derrubado.`,
      server: await getServer(serverId),
    };
  } catch (err) {
    const message = err instanceof CsgoBackendError ? err.message : "Falha ao derrubar servidor.";
    return { ok: false, message };
  }
}

export async function changeCsgoServerMap(serverId: string, map: string): Promise<ServerControlResult> {
  await syncServerApiStatus(serverId);
  const server = await getServer(serverId);
  const live = await queryCsgoServerLive(server.host, server.port);

  if (live.online && mapsMatch(live.mapRaw, map)) {
    return {
      ok: true,
      message: `Servidor já está em ${formatMapLabel(map)}.`,
      server,
      expectedMap: map,
      actualMap: live.mapRaw,
    };
  }

  if (live.online) {
    const rconAttempt = await tryRconChangeMap(serverId, server, map);
    if (rconAttempt.ok) return rconAttempt;
  }

  const stopped = await stopCsgoServer(serverId);
  if (!stopped.ok) {
    if (live.online) {
      return {
        ...stopped,
        warning: [stopped.warning, rconTcpHint(server)].filter(Boolean).join(" "),
      };
    }
    return stopped;
  }

  return startCsgoServer(serverId, map, { afterStop: true });
}

export async function registerCsgoServer(input: RegisterCsgoServerInput): Promise<ServerControlResult> {
  try {
    const server = await csgoBackendFetch<CsgoGameServer>("/api/servers", {
      method: "POST",
      body: {
        name: input.name,
        host: input.host,
        port: input.port,
        rconPort: input.rconPort,
        rconPassword: input.rconPassword,
        csgoDir: input.csgoDir,
        tickrate: input.tickrate ?? 128,
        pool: input.pool ?? "public",
      },
    });

    return {
      ok: true,
      message: `Servidor ${server.name} registrado na API.`,
      server,
    };
  } catch (err) {
    const message = err instanceof CsgoBackendError ? err.message : "Falha ao registrar servidor.";
    return { ok: false, message };
  }
}

export async function updateCsgoServerMetadata(
  serverId: string,
  patch: { name?: string; pool?: "ranked" | "warmup" | "public" },
): Promise<ServerControlResult> {
  try {
    const server = await csgoBackendFetch<CsgoGameServer>(`/api/servers/${serverId}`, {
      method: "PATCH",
      body: patch,
    });
    return {
      ok: true,
      message: `Servidor ${server.name} atualizado na API.`,
      server,
    };
  } catch (err) {
    const message =
      err instanceof CsgoBackendError ? err.message : "Falha ao atualizar servidor na API.";
    return { ok: false, message };
  }
}

export async function deleteCsgoServer(serverId: string): Promise<ServerControlResult> {
  const before = await getServer(serverId);
  const live = await queryCsgoServerLive(before.host, before.port);

  if (live.online) {
    const stopped = await stopCsgoServer(serverId);
    if (!stopped.ok) return stopped;
  }

  try {
    await csgoBackendFetch(`/api/servers/${serverId}`, { method: "DELETE" });
    return {
      ok: true,
      message: `Registro de ${before.name} removido da API.`,
    };
  } catch (err) {
    const message = err instanceof CsgoBackendError ? err.message : "Falha ao remover servidor.";
    return { ok: false, message };
  }
}

export async function cancelCsgoMatch(matchId: string): Promise<ServerControlResult> {
  try {
    await csgoBackendFetch(`/api/matches/${matchId}/cancel`, { method: "POST" });
    return { ok: true, message: "Partida cancelada." };
  } catch (err) {
    const message = err instanceof CsgoBackendError ? err.message : "Falha ao cancelar partida.";
    return { ok: false, message };
  }
}

export async function endCsgoMatch(matchId: string): Promise<ServerControlResult> {
  try {
    await csgoBackendFetch(`/api/matches/${matchId}/end`, { method: "POST" });
    return { ok: true, message: "Partida encerrada." };
  } catch (err) {
    const message = err instanceof CsgoBackendError ? err.message : "Falha ao encerrar partida.";
    return { ok: false, message };
  }
}
