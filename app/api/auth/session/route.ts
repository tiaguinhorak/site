import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { verifySessionToken } from "@/lib/security/session";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/serializers";
import {
  refreshSteamProfileForUserId,
  userNeedsSteamProfileRefresh,
} from "@/lib/steam/sync-profiles";
import { syncStaleSteamProfilesBackground } from "@/lib/steam/sync-profiles-background";

export async function GET(request: NextRequest) {
  syncStaleSteamProfilesBackground();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.json({ authenticated: false });
  }

  const session = verifySessionToken(cookie);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  let user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  if (userNeedsSteamProfileRefresh(user)) {
    try {
      await refreshSteamProfileForUserId(user.id);
      user = (await prisma.user.findUnique({ where: { id: user.id } })) ?? user;
    } catch {
      // Mantém cache local se a API Steam falhar momentaneamente.
    }
  }

  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    user: serializeUser(user),
  });
}
