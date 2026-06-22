import "server-only";

export function getCsgoApiBaseUrl(): string {
  const raw = process.env.CSGO_API_URL?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CSGO_API_URL must be set in production.");
    }
    return "http://127.0.0.1:3000";
  }
  return raw.replace(/\/$/, "");
}

/** Chave obrigatória em produção — nunca exposta ao browser. */
export function getCsgoApiKey(): string | undefined {
  const key = process.env.CSGO_API_KEY ?? process.env.API_KEY;
  const trimmed = key?.trim();
  if (!trimmed) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CSGO_API_KEY must be set in production.");
    }
    return undefined;
  }
  return trimmed;
}

export function csgoBackendAuthHeaders(): Record<string, string> {
  const key = getCsgoApiKey();
  return key ? { "x-api-key": key } : {};
}

export type DefaultCsgoServerEnv = {
  name: string;
  host: string;
  port: number;
  rconPort: number;
  rconPassword: string;
  csgoDir: string;
  tickrate: number;
};

/** Lê credenciais do servidor de jogo a partir do .env (bootstrap automático). */
export function readDefaultCsgoServerEnv(): DefaultCsgoServerEnv | null {
  const host = process.env.CSGO_SERVER_HOST?.trim();
  const rconPassword = process.env.CSGO_RCON_PASSWORD?.trim();
  if (!host || !rconPassword) return null;

  const port = Number(process.env.CSGO_SERVER_PORT ?? "27015");
  const rconPort = Number(process.env.CSGO_RCON_PORT ?? process.env.CSGO_SERVER_PORT ?? "27015");
  const tickrate = Number(process.env.CSGO_SERVER_TICKRATE ?? "128");

  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  if (!Number.isFinite(rconPort) || rconPort < 1 || rconPort > 65535) return null;

  return {
    name: process.env.CSGO_SERVER_NAME?.trim() || "Clutch #1",
    host,
    port,
    rconPort,
    rconPassword,
    csgoDir: process.env.CSGO_SERVER_DIR?.trim() || "/home/csgo/server",
    tickrate: Number.isFinite(tickrate) ? tickrate : 128,
  };
}

export function describeMissingCsgoServerEnv(): string {
  const missing: string[] = [];
  if (!process.env.CSGO_SERVER_HOST?.trim()) missing.push("CSGO_SERVER_HOST");
  if (!process.env.CSGO_RCON_PASSWORD?.trim()) missing.push("CSGO_RCON_PASSWORD");
  if (!missing.length) return "";
  return `Configure no .env: ${missing.join(", ")} (e opcionalmente CSGO_SERVER_PORT, CSGO_RCON_PORT, CSGO_SERVER_DIR).`;
}
