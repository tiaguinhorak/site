import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { getSessionUserId } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "notifications-mark-one",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    return jsonError(404, "Notificação não encontrada.");
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
