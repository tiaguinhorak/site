import "server-only";

function normalizeCsgoApiUrl(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

/** All api-csgo bases that receive equip/sticker pushes (ranked + warmup + extras). */
export function getCsgoApiPushTargets(): string[] {
  const urls: string[] = [];

  const primary = process.env.CSGO_API_URL?.trim();
  if (primary) urls.push(normalizeCsgoApiUrl(primary));

  const warmup = process.env.CSGO_WARMUP_API_URL?.trim();
  if (warmup) urls.push(normalizeCsgoApiUrl(warmup));

  const list = process.env.CSGO_API_URLS?.trim();
  if (list) {
    for (const part of list.split(",")) {
      const trimmed = part.trim();
      if (trimmed) urls.push(normalizeCsgoApiUrl(trimmed));
    }
  }

  return [...new Set(urls)];
}

export function getCsgoApiBaseUrl(): string {
  const targets = getCsgoApiPushTargets();
  if (targets.length > 0) {
    return targets[0];
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("CSGO_API_URL must be set in production.");
  }
  return "http://127.0.0.1:3000";
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
  pool?: "ranked" | "warmup" | "public";
};

/** Lê credenciais do servidor de jogo a partir do .env (bootstrap automático). */
function readCsgoServerEnvFromPrefix(prefix: string, defaults: {
  name: string;
  port: string;
  dir: string;
  tickrate: string;
}): DefaultCsgoServerEnv | null {
  const host = process.env[`${prefix}_HOST`]?.trim();
  const rconPassword = process.env[`${prefix}_RCON_PASSWORD`]?.trim();
  if (!host || !rconPassword) return null;

  const port = Number(process.env[`${prefix}_PORT`] ?? defaults.port);
  const rconPort = Number(
    process.env[`${prefix}_RCON_PORT`] ?? process.env[`${prefix}_PORT`] ?? defaults.port,
  );
  const tickrate = Number(
    process.env[`${prefix}_TICKRATE`] ?? process.env.CSGO_SERVER_TICKRATE ?? defaults.tickrate,
  );

  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  if (!Number.isFinite(rconPort) || rconPort < 1 || rconPort > 65535) return null;

  const nameKey = `${prefix}_NAME`;
  const dirKey = `${prefix}_DIR`;

  return {
    name: process.env[nameKey]?.trim() || defaults.name,
    host,
    port,
    rconPort,
    rconPassword,
    csgoDir:
      process.env[dirKey]?.trim() ||
      process.env.CSGO_SERVER_DIR?.trim() ||
      defaults.dir,
    tickrate: Number.isFinite(tickrate) ? tickrate : 128,
    pool: prefix === "CSGO_SERVER" ? "ranked" : undefined,
  };
}

export function readDefaultCsgoServerEnv(): DefaultCsgoServerEnv | null {
  return readCsgoServerEnvFromPrefix("CSGO_SERVER", {
    name: "Clutch #1",
    port: "27015",
    dir: "/home/csgo/server",
    tickrate: "128",
  });
}

/** Servidores adicionais (ex.: CSGO_SERVER2_* na mesma VPS, porta 27016). */
export function readAllDefaultCsgoServerEnvs(): DefaultCsgoServerEnv[] {
  const servers: DefaultCsgoServerEnv[] = [];
  const primary = readDefaultCsgoServerEnv();
  if (primary) servers.push(primary);

  const secondary = readCsgoServerEnvFromPrefix("CSGO_SERVER2", {
    name: "Clutch #2",
    port: "27016",
    dir: process.env.CSGO_SERVER_DIR?.trim() || "/home/csgo/server",
    tickrate: "128",
  });
  if (secondary) {
    const dup = servers.some(
      (s) => s.host === secondary.host && s.port === secondary.port,
    );
    if (!dup) servers.push(secondary);
  }

  return servers;
}

export function describeMissingCsgoServerEnv(): string {
  const missing: string[] = [];
  if (!process.env.CSGO_SERVER_HOST?.trim()) missing.push("CSGO_SERVER_HOST");
  if (!process.env.CSGO_RCON_PASSWORD?.trim()) missing.push("CSGO_RCON_PASSWORD");
  if (!missing.length) return "";
  return `Configure no .env: ${missing.join(", ")} (e opcionalmente CSGO_SERVER_PORT, CSGO_RCON_PORT, CSGO_SERVER_DIR).`;
}
