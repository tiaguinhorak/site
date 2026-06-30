import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getCsgoApiPushTargets } from "@/lib/csgo-api/config";
import { csgoBackendFetchAt, CsgoBackendError } from "@/lib/csgo-api/client";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";

type ApiDiagnostic = {
  baseUrl: string;
  healthOk: boolean;
  authOk: boolean;
  serverCount: number | null;
  latencyMs: number | null;
  error: string | null;
};

async function diagnoseBase(baseUrl: string): Promise<ApiDiagnostic> {
  const started = Date.now();
  const result: ApiDiagnostic = {
    baseUrl,
    healthOk: false,
    authOk: false,
    serverCount: null,
    latencyMs: null,
    error: null,
  };

  try {
    await csgoBackendFetchAt("/health", baseUrl, { timeoutMs: 6_000 });
    result.healthOk = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Health falhou.";
    result.latencyMs = Date.now() - started;
    return result;
  }

  try {
    const servers = await csgoBackendFetchAt<CsgoGameServer[]>("/api/servers", baseUrl, {
      timeoutMs: 6_000,
    });
    result.authOk = true;
    result.serverCount = Array.isArray(servers) ? servers.length : 0;
  } catch (err) {
    if (err instanceof CsgoBackendError && err.status === 401) {
      result.error = "Autenticação falhou (CSGO_API_KEY do site ≠ API_KEY do api-csgo).";
    } else {
      result.error = err instanceof Error ? err.message : "Falha ao listar servidores.";
    }
  }

  result.latencyMs = Date.now() - started;
  return result;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const targets = getCsgoApiPushTargets();
  const apis = await Promise.all(targets.map((base) => diagnoseBase(base)));

  return NextResponse.json({
    configured: targets.length,
    anyReachable: apis.some((api) => api.authOk),
    apis,
  });
}
