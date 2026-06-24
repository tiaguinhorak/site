import "server-only";

import { Rcon } from "rcon-client";
import type { CsgoServer } from "@/lib/generated/prisma/client";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { isManagedLocally } from "@/lib/csgo-api/server-manager";

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/**
 * RCON via loopback só quando api-csgo e srcds estão na mesma máquina (CSGO_RCON_LOOPBACK=1).
 * Site em dev no PC nunca deve redirecionar VPS pública para 127.0.0.1.
 */
function resolveRconConnectHost(
  server: Pick<CsgoServer, "host">,
  options?: { direct?: boolean },
): string {
  if (options?.direct) return server.host;
  if (isLoopbackHost(server.host)) return server.host;
  if (process.env.CSGO_RCON_LOOPBACK === "1" && isManagedLocally(server.host)) {
    return "127.0.0.1";
  }
  return server.host;
}

export function formatRconProbeError(err: unknown, host: string, port: number): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (/Authentication failed/i.test(msg)) {
    return "Senha RCON incorreta — o servidor respondeu TCP mas rejeitou a autenticação.";
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return (
      `TCP recusado em ${host}:${port}. RCON não está acessível da máquina do site ` +
      "(firewall bloqueando TCP, ou srcds sem -usercon). A query A2S (UDP) pode funcionar mesmo com RCON bloqueado."
    );
  }
  if (/ETIMEDOUT|Timeout for packet/i.test(msg)) {
    return (
      `Timeout em ${host}:${port} — este PC não alcança o servidor (rede, firewall ou IP errado). ` +
      "Confira se o warmup está na mesma LAN e se TCP 27015 está liberado."
    );
  }

  return `RCON (${host}:${port}): ${msg}`;
}

export type RconAttemptResult =
  | { ok: true; output: string; connectHost: string; connectPort: number }
  | { ok: false; error: string; connectHost: string; connectPort: number };

export async function sendRconCommand(
  server: Pick<CsgoServer, "host" | "rconPort" | "rconPassword">,
  command: string,
  options?: { direct?: boolean; connectPort?: number },
): Promise<string> {
  const connectHost = resolveRconConnectHost(server, options);
  const connectPort = options?.connectPort ?? server.rconPort;

  let rcon: Rcon | undefined;
  try {
    rcon = await Rcon.connect({
      host: connectHost,
      port: connectPort,
      password: server.rconPassword,
      timeout: 8000,
    });
    const result = await rcon.send(command);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha RCON";
    throw new CsgoApiError(`RCON: ${msg}`, 502);
  } finally {
    rcon?.end();
  }
}

export async function tryRconCommand(
  server: Pick<CsgoServer, "host" | "rconPort" | "rconPassword"> & { gamePort?: number },
  command: string,
  options?: { direct?: boolean },
): Promise<RconAttemptResult> {
  const direct = options?.direct ?? false;
  const connectHost = resolveRconConnectHost(server, { direct });
  const ports = new Set<number>();
  ports.add(server.rconPort);
  if (server.gamePort) ports.add(server.gamePort);

  let lastErr: unknown = null;
  let lastPort = server.rconPort;

  for (const port of ports) {
    lastPort = port;
    try {
      const output = await sendRconCommand(server, command, { direct, connectPort: port });
      return { ok: true, output, connectHost, connectPort: port };
    } catch (err) {
      lastErr = err;
    }
  }

  return {
    ok: false,
    error: formatRconProbeError(lastErr, connectHost, lastPort),
    connectHost,
    connectPort: lastPort,
  };
}

export async function testRconConnection(
  server: Pick<CsgoServer, "host" | "rconPort" | "rconPassword">,
  options?: { direct?: boolean; gamePort?: number },
): Promise<boolean> {
  const result = await tryRconCommand(
    { ...server, gamePort: options?.gamePort },
    "status",
    { direct: options?.direct },
  );
  return result.ok;
}
