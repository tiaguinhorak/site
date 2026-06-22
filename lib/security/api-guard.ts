import { NextRequest, NextResponse } from "next/server";
import { API_REQUEST_HEADER } from "@/lib/brand";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/i18n/server";
import { LIMITS } from "./constants";
import { checkRateLimit, checkRateLimitAsync, getClientIp } from "./rate-limit";
import { isPlainObject } from "./sanitize";
import { readSessionFromCookieHeader } from "./session";

function localeFromRequest(request: NextRequest): Locale {
  const value = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const locale = localeFromRequest(request);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!host) return null;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return jsonError(403, apiErrorMessage(locale, "forbiddenOrigin"));
      }
    } catch {
      return jsonError(403, apiErrorMessage(locale, "invalidOrigin"));
    }
    return null;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return jsonError(403, apiErrorMessage(locale, "forbiddenOrigin"));
  }

  try {
    const refererHost = new URL(referer).host;
    if (refererHost !== host) {
      return jsonError(403, apiErrorMessage(locale, "forbiddenOrigin"));
    }
  } catch {
    return jsonError(403, apiErrorMessage(locale, "invalidOrigin"));
  }

  return null;
}

export function assertCsrfHeader(request: NextRequest): NextResponse | null {
  const locale = localeFromRequest(request);
  const header = request.headers.get(API_REQUEST_HEADER);
  if (header !== "1") {
    return jsonError(403, apiErrorMessage(locale, "csrf"));
  }
  return null;
}

export async function assertRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const locale = localeFromRequest(request);
  const ip = getClientIp(request.headers);
  const key = `${namespace}:${ip}`;
  const result = await checkRateLimitAsync(key, limit, windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: apiErrorMessage(locale, "rateLimit") },
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
  const locale = localeFromRequest(request);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      data: null,
      error: jsonError(415, apiErrorMessage(locale, "contentTypeJson")),
    };
  }

  const raw = await request.text();
  if (raw.length > LIMITS.jsonBody) {
    return {
      data: null,
      error: jsonError(413, apiErrorMessage(locale, "bodyTooLarge")),
    };
  }

  if (!raw.trim()) {
    return {
      data: null,
      error: jsonError(400, apiErrorMessage(locale, "bodyEmpty")),
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return {
        data: null,
        error: jsonError(400, apiErrorMessage(locale, "jsonInvalid")),
      };
    }
    return { data: parsed as T, error: null };
  } catch {
    return {
      data: null,
      error: jsonError(400, apiErrorMessage(locale, "jsonMalformed")),
    };
  }
}

export function requireSession(request: NextRequest): {
  session: { userId: string } | null;
  error: NextResponse | null;
} {
  const locale = localeFromRequest(request);
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return {
      session: null,
      error: jsonError(401, apiErrorMessage(locale, "sessionInvalid")),
    };
  }
  return { session: { userId: session.userId }, error: null };
}

export async function applyApiGuards(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const csrfError = assertCsrfHeader(request);
  if (csrfError) return csrfError;

  const rateError = await assertRateLimit(request, namespace, limit, windowMs);
  if (rateError) return rateError;

  return null;
}
