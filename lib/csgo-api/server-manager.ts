import "server-only";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "ssh2";
import type { CsgoServer } from "@/lib/generated/prisma/client";
import { CsgoApiError } from "@/lib/csgo-api/http";

const execAsync = promisify(exec);

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/** API e srcds na mesma VPS — host público ainda é local para screen/RCON. */
export function isManagedLocally(host: string): boolean {
  if (isLoopbackHost(host)) return true;
  const candidates = [
    process.env.CSGO_SERVER_HOST,
    process.env.CSGO_LOCAL_HOSTS,
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return candidates.includes(host);
}

export function getCsgoServerOsUser(): string {
  return process.env.CSGO_SERVER_USER?.trim() || "csgo";
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function wrapForLocalShell(command: string): string {
  const user = getCsgoServerOsUser();
  return `sudo -u ${user} bash -lc ${shellQuote(command)}`;
}

async function runRemoteCommand(
  server: Pick<CsgoServer, "host" | "sshPort" | "sshUser" | "sshPassword">,
  command: string,
): Promise<string> {
  if (!server.sshUser || !server.sshPassword) {
    throw new CsgoApiError("SSH não configurado para servidor remoto.");
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          let stdout = "";
          let stderr = "";
          stream
            .on("close", (code: number) => {
              conn.end();
              if (code !== 0) {
                reject(new Error(stderr || `Comando falhou (code ${code})`));
              } else {
                resolve(stdout);
              }
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString();
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString();
            });
        });
      })
      .on("error", reject)
      .connect({
        host: server.host,
        port: server.sshPort,
        username: server.sshUser ?? undefined,
        password: server.sshPassword ?? undefined,
      });
  });
}

async function runCommand(server: CsgoServer, command: string): Promise<string> {
  const wrapped = isManagedLocally(server.host) ? wrapForLocalShell(command) : command;

  if (isManagedLocally(server.host)) {
    try {
      const { stdout } = await execAsync(wrapped);
      return stdout;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Comando local falhou";
      throw new CsgoApiError(msg, 502);
    }
  }
  return runRemoteCommand(server, wrapped);
}

function escapeLaunchArg(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function buildLaunchCommand(
  server: Pick<CsgoServer, "csgoDir" | "port" | "tickrate" | "rconPassword">,
  map: string,
  password?: string,
): string {
  const svPassword = password ? ` +sv_password "${escapeLaunchArg(password)}"` : "";
  const rconPassword = server.rconPassword
    ? ` +rcon_password "${escapeLaunchArg(server.rconPassword)}"`
    : "";

  return (
    `cd "${server.csgoDir}" && ./srcds_run -game csgo -console -usercon ` +
    `+game_type 0 +game_mode 1 +map ${map} -port ${server.port} ` +
    `-tickrate ${server.tickrate}${rconPassword}${svPassword}`
  );
}

export async function startCsgoServer(
  server: CsgoServer,
  options?: { map?: string; password?: string },
): Promise<void> {
  const map = options?.map ?? "de_dust2";
  const inner = buildLaunchCommand(server, map, options?.password);
  const command = `screen -dmS ${server.screenSession} bash -c ${shellQuote(inner)}`;
  await runCommand(server, command);
}

export async function forceKillCsgoPort(server: CsgoServer): Promise<void> {
  const port = server.port;
  const user = getCsgoServerOsUser();
  const command =
    `fuser -k ${port}/udp 2>/dev/null || true; ` +
    `fuser -k ${port}/tcp 2>/dev/null || true; ` +
    `pkill -u ${user} -f srcds_linux 2>/dev/null || true; ` +
    `sleep 2`;
  await runCommand(server, command);
}

export async function stopCsgoServer(server: CsgoServer): Promise<void> {
  const session = server.screenSession;
  const command =
    `for s in $(screen -ls 2>/dev/null | grep -F ".${session}" | awk '{print $1}'); do ` +
    `screen -S "$s" -X quit || true; done`;

  await runCommand(server, command);
}

export async function isScreenRunning(server: CsgoServer): Promise<boolean> {
  try {
    const out = await runCommand(
      server,
      `screen -ls 2>/dev/null | grep -F ".${server.screenSession}" || true`,
    );
    return out.includes(server.screenSession);
  } catch {
    return false;
  }
}

export function slugifySessionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
