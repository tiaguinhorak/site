import "server-only";

import { Rcon } from "rcon-client";
import type { CsgoServer } from "@/lib/generated/prisma/client";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { isManagedLocally } from "@/lib/csgo-api/server-manager";

function rconHost(server: Pick<CsgoServer, "host">): string {
  return isManagedLocally(server.host) ? "127.0.0.1" : server.host;
}

export async function sendRconCommand(
  server: Pick<CsgoServer, "host" | "rconPort" | "rconPassword">,
  command: string,
): Promise<string> {
  let rcon: Rcon | undefined;
  try {
    rcon = await Rcon.connect({
      host: rconHost(server),
      port: server.rconPort,
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

export async function testRconConnection(
  server: Pick<CsgoServer, "host" | "rconPort" | "rconPassword">,
): Promise<boolean> {
  try {
    await sendRconCommand(server, "status");
    return true;
  } catch {
    return false;
  }
}
