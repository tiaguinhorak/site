import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import {
  describeMissingCsgoServerEnv,
  readDefaultCsgoServerEnv,
} from "@/lib/csgo-api/config";
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";
import { registerCsgoServer } from "@/lib/csgo-api/server-control";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";

export type BootstrapCsgoServerResult = {
  ok: boolean;
  message: string;
  server?: CsgoGameServer;
  registered: boolean;
};

function serverEndpoint(server: CsgoGameServer): string {
  return `${server.host}:${server.port}`;
}

async function listCsgoServers(): Promise<CsgoGameServer[]> {
  try {
    return await csgoBackendFetch<CsgoGameServer[]>("/api/servers");
  } catch {
    return [];
  }
}

/**
 * Garante que exista ao menos um servidor na API CS:GO.
 * Se a lista estiver vazia e o .env tiver CSGO_SERVER_HOST + CSGO_RCON_PASSWORD, registra automaticamente.
 */
export async function ensureDefaultCsgoServerRegistered(): Promise<BootstrapCsgoServerResult> {
  const servers = await listCsgoServers();
  if (servers.length > 0) {
    return {
      ok: true,
      message: `Servidor ${servers[0]!.name} (${serverEndpoint(servers[0]!)}) já registrado na API.`,
      server: servers[0],
      registered: false,
    };
  }

  const env = readDefaultCsgoServerEnv();
  if (!env) {
    return {
      ok: false,
      message: `Nenhum servidor na API CS:GO. ${describeMissingCsgoServerEnv()} Ou registre manualmente em Admin → Infra CS:GO.`,
      registered: false,
    };
  }

  const result = await registerCsgoServer(env);
  if (!result.ok || !result.server) {
    return {
      ok: false,
      message: result.message,
      registered: false,
    };
  }

  await afterCsgoServerMutation();

  return {
    ok: true,
    message: `Servidor ${result.server.name} registrado automaticamente (${serverEndpoint(result.server)}).`,
    server: result.server,
    registered: true,
  };
}

export function getRankedServerBlockedMessage(): string {
  return (
    "Nenhum servidor registrado na API CS:GO. " +
    "Registre em Admin → Infra CS:GO (+ Registrar servidor) ou adicione CSGO_SERVER_HOST e CSGO_RCON_PASSWORD no .env e reinicie o site."
  );
}
