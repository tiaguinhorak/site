import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRequestOrigin, isHttpsAppUrl } from "@/lib/app-url";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./constants";

type SessionPayload = {
  userId: string;
  exp: number;
  nonce: string;
  profileComplete?: boolean;
  isAdmin?: boolean;
};

export type SessionOptions = {
  profileComplete?: boolean;
  isAdmin?: boolean;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production (min 32 chars).");
  }
  return "dev-only-session-secret-min-32-characters!!";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(
  userId: string,
  options: SessionOptions = {},
): string {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    nonce: randomBytes(16).toString("hex"),
    profileComplete: options.profileComplete ?? true,
    isAdmin: options.isAdmin ?? false,
  };
  const payloadStr = JSON.stringify(payload);
  return `${Buffer.from(payloadStr, "utf8").toString("base64url")}.${sign(payloadStr)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  try {
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const expected = sign(payloadStr);
    const sigBuf = Buffer.from(signature, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(payloadStr) as SessionPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.nonce !== "string"
    ) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function useSecureCookies(request?: NextRequest): boolean {
  if (request) {
    try {
      return getRequestOrigin(request).startsWith("https://");
    } catch {
      return false;
    }
  }
  if (process.env.NODE_ENV === "production") {
    return isHttpsAppUrl() || process.env.TRUST_TUNNEL === "true";
  }
  return false;
}

export function getSessionCookieOptions(): string {
  const secure = useSecureCookies() ? "Secure; " : "";
  return `${SESSION_COOKIE}=${""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; ${secure}`;
}

export function buildSessionCookie(token: string): string {
  const secure = useSecureCookies() ? "Secure; " : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; ${secure}`;
}

export function applySessionCookie(
  response: NextResponse,
  token: string,
  request?: NextRequest,
): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
    secure: useSecureCookies(request),
  });
  return response;
}

export function clearSessionCookie(): string {
  const secure = useSecureCookies() ? "Secure; " : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${secure}`;
}

export function readSessionFromCookieHeader(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = match.slice(SESSION_COOKIE.length + 1);
  return verifySessionToken(token);
}
