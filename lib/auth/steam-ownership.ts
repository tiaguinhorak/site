import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  alternateSteam2,
  isSteam2,
  steam2ToSteamId64,
  steamId64ToSteam2,
} from "@/lib/steam/steam-id";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { jsonError } from "@/lib/security/api-guard";
import { readSessionFromCookieHeader } from "@/lib/security/session";

function steamIdsMatch(userSteamId: string, routeSteamId: string): boolean {
  const user = userSteamId.trim();
  const route = routeSteamId.trim();
  if (!user || !route) return false;
  if (user === route) return true;

  const user64 = isSteam2(user) ? steam2ToSteamId64(user) : user;
  const route64 = isSteam2(route) ? steam2ToSteamId64(route) : route;
  if (user64 && route64 && user64 === route64) return true;

  const user2 = steamId64ToSteam2(user) ?? (isSteam2(user) ? user : null);
  const route2 = steamId64ToSteam2(route) ?? (isSteam2(route) ? route : null);
  if (user2 && route2) {
    if (user2 === route2) return true;
    const routeAlt = alternateSteam2(route2);
    if (routeAlt && user2 === routeAlt) return true;
    const userAlt = alternateSteam2(user2);
    if (userAlt && userAlt === route2) return true;
  }

  return false;
}

/** Ensures the session user's linked Steam account matches the route steamId. */
export async function assertSessionOwnsSteamId(
  request: NextRequest,
  routeSteamId: string,
): Promise<NextResponse | null> {
  const locale = await getRequestLocale(request);
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return jsonError(401, apiErrorMessage(locale, "sessionInvalid"));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { steamId: true },
  });

  if (!user?.steamId || !steamIdsMatch(user.steamId, routeSteamId)) {
    return jsonError(403, apiErrorMessage(locale, "forbiddenOrigin"));
  }

  return null;
}
