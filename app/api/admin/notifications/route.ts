import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminNotificationSendSchema } from "@/lib/admin/schemas";
import { listAdminNotifications } from "@/lib/admin/queries";
import type { ContentTranslations } from "@/lib/i18n-content";
import { buildNotificationTranslations } from "@/lib/translation/auto-translate";

async function resolveNotificationTranslations(
  title: string,
  body: string,
  autoTranslate: boolean | undefined,
  manual: ContentTranslations | null | undefined,
): Promise<ContentTranslations | null> {
  if (manual && (manual.en || manual.es)) {
    return manual;
  }
  if (autoTranslate) {
    return await buildNotificationTranslations(title, body);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const result = await listAdminNotifications({ page, limit });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-notification-send",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminNotificationSendSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const translations = await resolveNotificationTranslations(
    parsed.data.title,
    parsed.data.body,
    parsed.data.autoTranslate,
    parsed.data.translations,
  );

  const notificationData = {
    title: parsed.data.title,
    body: parsed.data.body,
    type: parsed.data.type,
    translations: translations ?? undefined,
  };

  const broadcast = parsed.data.broadcast === true;

  if (broadcast) {
    const users = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        ...notificationData,
      })),
    });

    await logAdminAction({
      adminId: admin!.id,
      action: "NOTIFICATION_BROADCAST",
      targetType: "notification",
      summary: `Broadcast: ${parsed.data.title}`,
      metadata: { count: users.length, type: parsed.data.type },
    });

    return NextResponse.json({ ok: true, sent: users.length, broadcast: true });
  }

  if (!parsed.data.userId) {
    return jsonError(400, "Selecione um usuário ou marque broadcast.");
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!target) {
    return jsonError(404, "Usuário não encontrado.");
  }

  const notification = await prisma.notification.create({
    data: {
      userId: parsed.data.userId,
      ...notificationData,
    },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "NOTIFICATION_SEND",
    targetType: "notification",
    targetId: notification.id,
    summary: `Notificação para ${target.nickname}: ${parsed.data.title}`,
    metadata: { userId: target.id, type: parsed.data.type },
  });

  return NextResponse.json({ ok: true, notification });
}
