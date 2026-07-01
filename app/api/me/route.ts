import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { serializeUser } from "@/lib/serializers";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import { prisma } from "@/lib/prisma";
import {
  refreshSteamProfileIfDue,
} from "@/lib/steam/sync-profiles";
import { syncStaleSteamProfilesBackground } from "@/lib/steam/sync-profiles-background";

export async function GET(request: NextRequest) {
  syncStaleSteamProfilesBackground();

  let user = await getSessionUser(request);
  if (!user) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  if (user.steamId) {
    try {
      await refreshSteamProfileIfDue(user.id);
      user = (await prisma.user.findUnique({ where: { id: user.id } })) ?? user;
    } catch {
      // Mantém dados em cache se a API Steam falhar.
    }
  }

  return NextResponse.json({ user: serializeUser(user) });
}
