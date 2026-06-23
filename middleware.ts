import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { RATE_LIMITS } from "@/lib/security/constants";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { verifySessionTokenEdge } from "@/lib/security/session-edge";

const AUTH_PATHS = ["/login", "/register"];
const PROTECTED_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";
const COMPLETE_PROFILE_PATH = "/completar-perfil";

function apiRateLimitResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request.headers);
    const result = checkRateLimit(
      `api-global:${ip}`,
      RATE_LIMITS.apiRead.limit,
      RATE_LIMITS.apiRead.windowMs,
    );
    if (!result.allowed) {
      return apiRateLimitResponse(result.retryAfterMs);
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionTokenEdge(token) : null;
  const isAuthenticated = Boolean(session);
  const needsProfileCompletion =
    isAuthenticated && session?.profileComplete === false;
  const isAdmin = isAuthenticated && session?.isAdmin === true;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === COMPLETE_PROFILE_PATH) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!needsProfileCompletion) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith(PROTECTED_PREFIX) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (needsProfileCompletion) {
    if (pathname.startsWith(PROTECTED_PREFIX)) {
      return NextResponse.redirect(
        new URL(COMPLETE_PROFILE_PATH, request.url),
      );
    }
  }

  if (AUTH_PATHS.includes(pathname) && isAuthenticated && !needsProfileCompletion) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/" && isAuthenticated) {
    if (needsProfileCompletion) {
      return NextResponse.redirect(new URL(COMPLETE_PROFILE_PATH, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/api/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/completar-perfil",
  ],
};
