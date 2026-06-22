import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { requireSession } from "@/lib/security/api-guard";
import { getCsgoApiBaseUrl, getCsgoApiKey, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";
import { csgoError } from "@/lib/csgo-api/http";

export type CsgoProxyAccess = "public" | "session" | "admin";

async function requireCsgoProxyAccess(
  request: NextRequest,
  access: CsgoProxyAccess,
): Promise<NextResponse | null> {
  const incomingKey = request.headers.get("x-api-key");
  const configuredKey = getCsgoApiKey();
  if (configuredKey && incomingKey && incomingKey === configuredKey) {
    return null;
  }

  if (access === "public") {
    return csgoError("Unauthorized", 401);
  }

  if (access === "admin") {
    const { error } = await requireAdmin(request);
    return error;
  }

  const { error } = requireSession(request);
  return error;
}

function buildUpstreamUrl(path: string, searchParams: URLSearchParams): string {
  const base = getCsgoApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, `${base}/`);
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function proxyToCsgoApi(
  request: NextRequest,
  upstreamPath: string,
  options?: {
    access?: CsgoProxyAccess;
    method?: string;
    params?: Record<string, string>;
  },
): Promise<NextResponse> {
  const access = options?.access ?? "admin";
  const authError = await requireCsgoProxyAccess(request, access);
  if (authError) return authError;

  let path = upstreamPath;
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      path = path.replace(`[${key}]`, encodeURIComponent(value));
    }
  }

  const method = options?.method ?? request.method;
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(buildUpstreamUrl(path, request.nextUrl.searchParams), {
      method,
      headers: {
        ...csgoBackendAuthHeaders(),
        ...(body ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
      },
      body: body || undefined,
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao conectar ao backend CS:GO.";
    return csgoError(`Backend CS:GO indisponível: ${message}`, 502);
  }

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const payload = await upstream.text();

  return new NextResponse(payload, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

type RouteContext = { params: Promise<Record<string, string>> };

export async function handleCsgoProxy(
  request: NextRequest,
  upstreamPath: string,
  access: CsgoProxyAccess,
  context?: RouteContext,
): Promise<NextResponse> {
  const params = context ? await context.params : undefined;
  return proxyToCsgoApi(request, upstreamPath, { access, params });
}
