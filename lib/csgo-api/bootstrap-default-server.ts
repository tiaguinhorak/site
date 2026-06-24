import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import {
  describeMissingCsgoServerEnv,
  readAllDefaultCsgoServerEnvs,
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

async function listCsgoServers(): Promise<CsgoGameServer[]> {
  try {
    return await csgoBackendFetch<CsgoGameServer[]>("/api/servers");
  } catch {
    return [];
  }
}

/**
 * Garante que existam servidores na API CS:GO (bootstrap do .env se a lista estiver vazia).
 */
export async function ensureAllDefaultCsgoServersRegistered(): Promise<BootstrapCsgoServerResult> {
  let existing = await listCsgoServers();
  let registeredAny = false;
  const envServers = readAllDefaultCsgoServerEnvs();

  if (!envServers.length && existing.length === 0) {
    return {
      ok: false,
      message: `Nenhum servidor na API CS:GO. ${describeMissingCsgoServerEnv()} Ou registre em Admin → Infra CS:GO.`,
      registered: false,
    };
  }

  for (const env of envServers) {
    const already = existing.some(
      (s) => s.host === env.host && s.port === env.port,
    );
    if (already) continue;

    const result = await registerCsgoServer({
      ...env,
      pool: env.pool ?? "ranked",
    });
    if (!result.ok || !result.server) {
      return {
        ok: false,
        message: result.message,
        registered: registeredAny,
      };
    }
    registeredAny = true;
    existing = await listCsgoServers();
  }

  const servers = await listCsgoServers();
  if (!servers.length) {
    return {
      ok: false,
      message: getRankedServerBlockedMessage(),
      registered: false,
    };
  }

  await afterCsgoServerMutation();

  return {
    ok: true,
    message: registeredAny
      ? `${servers.length} servidor(es) na API (${envServers.length} via .env).`
      : `${servers.length} servidor(es) já registrados na API.`,
    server: servers[0],
    registered: registeredAny,
  };
}

/** @deprecated Use ensureAllDefaultCsgoServersRegistered */
export async function ensureDefaultCsgoServerRegistered(): Promise<BootstrapCsgoServerResult> {
  return ensureAllDefaultCsgoServersRegistered();
}

export function getRankedServerBlockedMessage(): string {
  return (
    "Nenhum servidor registrado na API CS:GO. " +
    "Registre em Admin → Infra CS:GO (+ Registrar servidor) ou adicione CSGO_SERVER_HOST e CSGO_RCON_PASSWORD no .env e reinicie o site."
  );
}
