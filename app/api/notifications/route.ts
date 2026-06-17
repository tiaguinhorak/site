import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { getSessionUserId } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Agora";
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days} dias`;
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      read: n.read,
      type: n.type.toLowerCase(),
      time: formatRelativeTime(n.createdAt),
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "notifications-mark-all",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  if (data?.markAllRead !== true) {
    return jsonError(400, "Ação inválida.");
  }

  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
