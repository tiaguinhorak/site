import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  requireSession,
} from "@/lib/security/api-guard";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { serializeUser } from "@/lib/serializers";
import { buildUserSteamUnlink } from "@/lib/steam/sync-user";

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "profile-steam-unlink",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const currentUser = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!currentUser) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: buildUserSteamUnlink(currentUser),
  });

  return NextResponse.json({ ok: true, user: serializeUser(user) });
}
