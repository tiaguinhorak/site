import { NextRequest, NextResponse } from "next/server";
import { API_REQUEST_HEADER } from "@/lib/brand";
import { LIMITS } from "./constants";
import { checkRateLimit, getClientIp } from "./rate-limit";
import { isPlainObject } from "./sanitize";
import { readSessionFromCookieHeader } from "./session";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return null;

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return jsonError(403, "Origem não permitida.");
    }
  } catch {
    return jsonError(403, "Origem inválida.");
  }

  return null;
}

export function assertCsrfHeader(request: NextRequest): NextResponse | null {
  const header = request.headers.get(API_REQUEST_HEADER);
  if (header !== "1") {
    return jsonError(403, "Requisição não autorizada.");
  }
  return null;
}

export function assertRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const ip = getClientIp(request.headers);
  const key = `${namespace}:${ip}`;
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
        },
      },
    );
  }
  return null;
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: NextRequest,
): Promise<{ data: T | null; error: NextResponse | null }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { data: null, error: jsonError(415, "Content-Type deve ser application/json.") };
  }

  const raw = await request.text();
  if (raw.length > LIMITS.jsonBody) {
    return { data: null, error: jsonError(413, "Corpo da requisição muito grande.") };
  }

  if (!raw.trim()) {
    return { data: null, error: jsonError(400, "Corpo da requisição vazio.") };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return { data: null, error: jsonError(400, "JSON inválido.") };
    }
    return { data: parsed as T, error: null };
  } catch {
    return { data: null, error: jsonError(400, "JSON malformado.") };
  }
}

export function requireSession(request: NextRequest): {
  session: { userId: string } | null;
  error: NextResponse | null;
} {
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return { session: null, error: jsonError(401, "Sessão inválida ou expirada.") };
  }
  return { session: { userId: session.userId }, error: null };
}

export function applyApiGuards(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const csrfError = assertCsrfHeader(request);
  if (csrfError) return csrfError;

  const rateError = assertRateLimit(request, namespace, limit, windowMs);
  if (rateError) return rateError;

  return null;
}
