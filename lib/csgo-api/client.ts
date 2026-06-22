import "server-only";

import { getCsgoApiBaseUrl, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";

type CsgoRequestInit = {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string | undefined>;
};

export class CsgoBackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CsgoBackendError";
  }
}

function buildUrl(path: string, searchParams?: Record<string, string | undefined>): string {
  const base = getCsgoApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, `${base}/`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Cliente server-side para o backend CS:GO (não expõe a API key ao browser). */
export async function csgoBackendFetch<T = unknown>(
  path: string,
  init: CsgoRequestInit = {},
): Promise<T> {
  const method = init.method ?? (init.body ? "POST" : "GET");
  const res = await fetch(buildUrl(path, init.searchParams), {
    method,
    headers: {
      ...csgoBackendAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

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

export async function getCsgoBackendHealth(): Promise<{ status: string; timestamp: string }> {
  return csgoBackendFetch("/health");
}
