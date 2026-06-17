import type { NextRequest } from "next/server";

const TUNNEL_HOST_SUFFIXES = [".ngrok-free.dev", ".ngrok.io", ".ngrok.app"];

function isTunnelHost(hostname: string): boolean {
  return TUNNEL_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
}

/** Origem pública da requisição (ngrok/proxy ou nextUrl). */
export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    if (host) return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

/**
 * URL base do app para redirects (Steam, callbacks).
 * Em dev via ngrok, usa a origem da requisição automaticamente.
 */
export function getAppUrl(request?: NextRequest): string {
  const explicit =
    process.env.TUNNEL_URL ??
    process.env.NGROK_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (request && process.env.NODE_ENV !== "production") {
    const origin = getRequestOrigin(request);
    try {
      const { hostname } = new URL(origin);
      if (isTunnelHost(hostname) || process.env.TRUST_TUNNEL === "true") {
        return origin.replace(/\/$/, "");
      }
    } catch {
      // fall through
    }
  }

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production.");
  }

  return request ? getRequestOrigin(request).replace(/\/$/, "") : "http://localhost:3000";
}

export function isHttpsAppUrl(): boolean {
  const url =
    process.env.TUNNEL_URL ??
    process.env.NGROK_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";
  return url.startsWith("https://");
}
