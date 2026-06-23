import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { pushPlayerLoadoutToGameServer } from "@/lib/inventory/push-loadout-to-game-server";
import {
  applyApiGuards,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { apiErrorMessage, getRequestLocale } from "@/lib/i18n/server";

/** Re-push equipped loadout to game VPS without changing Postgres equip state. */
export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "inventory-push-loadout",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { steamId: true },
  });

  if (!user?.steamId) {
    return NextResponse.json(
      { error: apiErrorMessage(locale, "steamNotLinked") },
      { status: 400 },
    );
  }

  const gameSync = await pushPlayerLoadoutToGameServer(user.steamId);
  return NextResponse.json({ ok: gameSync.ok, gameSync });
}
