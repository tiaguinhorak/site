import "server-only";

import { getCsgoApiBaseUrl, getCsgoApiPushTargets, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";

type CsgoRequestInit = {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string | undefined>;
  /** Aborta a requisição após N ms para o painel nunca pendurar (padrão 15s). */
  timeoutMs?: number;
};

const DEFAULT_CSGO_FETCH_TIMEOUT_MS = 15_000;

export class CsgoBackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CsgoBackendError";
  }
}

function buildUrl(
  path: string,
  searchParams?: Record<string, string | undefined>,
  baseUrl?: string,
): string {
  const base = baseUrl ?? getCsgoApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, `${base}/`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export type CsgoBackendServer = CsgoGameServer & { apiBaseUrl: string };

export type CsgoBackendError_ = { baseUrl: string; message: string };

export type CsgoApiServersResult = {
  servers: CsgoBackendServer[];
  errors: CsgoBackendError_[];
  /** true quando há pelo menos um backend configurado e respondendo. */
  anyReachable: boolean;
  configured: number;
};

/** Lista servidores de todas as APIs, reportando falhas por backend (não engole erros). */
export async function listAllCsgoApiServersWithStatus(): Promise<CsgoApiServersResult> {
  const merged: CsgoBackendServer[] = [];
  const errors: CsgoBackendError_[] = [];
  const seen = new Set<string>();
  const targets = getCsgoApiPushTargets();
  let anyReachable = false;

  for (const base of targets) {
    try {
      const servers = await csgoBackendFetchAt<CsgoGameServer[]>("/api/servers", base, {
        timeoutMs: 8_000,
      });
      anyReachable = true;
      for (const server of servers) {
        const key = `${server.host}:${server.port}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ ...server, apiBaseUrl: base });
      }
    } catch (err) {
      const message = err instanceof CsgoBackendError ? err.message : "Backend inacessível.";
      errors.push({ baseUrl: base, message });
    }
  }

  return { servers: merged, errors, anyReachable, configured: targets.length };
}

/** Lista servidores de todas as APIs (ranked + warmup + extras). */
export async function listAllCsgoApiServers(): Promise<CsgoBackendServer[]> {
  const { servers } = await listAllCsgoApiServersWithStatus();
  return servers;
}

/** Encontra qual api-csgo tem este server id (ranked vs warmup). */
export async function resolveCsgoServerBackend(serverId: string): Promise<string | null> {
  for (const base of getCsgoApiPushTargets()) {
    try {
      await csgoBackendFetchAt(`/api/servers/${serverId}`, base);
      return base;
    } catch {
      /* not on this API */
    }
  }
  return null;
}

/** Cliente server-side para o backend CS:GO (não expõe a API key ao browser). */
export async function csgoBackendFetchAt<T = unknown>(
  path: string,
  baseUrl: string,
  init: CsgoRequestInit = {},
): Promise<T> {
  const method = init.method ?? (init.body ? "POST" : "GET");
  const timeoutMs = init.timeoutMs ?? DEFAULT_CSGO_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, init.searchParams, baseUrl), {
      method,
      headers: {
        ...csgoBackendAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new CsgoBackendError(
        `Backend CS:GO não respondeu em ${timeoutMs / 1000}s (${baseUrl}). ` +
          `Verifique se o api-csgo está no ar e acessível.`,
        504,
      );
    }
    const message = err instanceof Error ? err.message : "Falha de rede";
    throw new CsgoBackendError(`Falha ao conectar no backend CS:GO (${baseUrl}): ${message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!res.ok) {
    let message = text;
    try {
      const json = JSON.parse(text) as { error?: string };
      message = json.error ?? text;
    } catch {
      /* plain text error */
    }
    throw new CsgoBackendError(message || `Erro ${res.status} no backend CS:GO`, res.status);
  }

  if (!text) return undefined as T;
  if (contentType.includes("application/json")) {
    return JSON.parse(text) as T;
  }
  return text as T;
}

export async function csgoBackendFetch<T = unknown>(
  path: string,
  init: CsgoRequestInit = {},
): Promise<T> {
  return csgoBackendFetchAt(path, getCsgoApiBaseUrl(), init);
}

export async function getCsgoBackendHealth(): Promise<{ status: string; timestamp: string }> {
  return csgoBackendFetch("/health");
}
