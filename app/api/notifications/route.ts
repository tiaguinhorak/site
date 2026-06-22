import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { getSessionUserId } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { type NotificationType } from "@/lib/generated/prisma/client";
import { getMessages } from "next-intl/server";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import { serializeNotificationForLocale } from "@/lib/notifications/serialize";

const NOTIFICATION_TYPES: NotificationType[] = [
  "SYSTEM",
  "MATCH",
  "SOCIAL",
  "PROMO",
];

function parseNotificationTypeFilter(raw: string | null): NotificationType | null {
  if (!raw || raw === "all") return null;
  const upper = raw.toUpperCase();
  if (NOTIFICATION_TYPES.includes(upper as NotificationType)) {
    return upper as NotificationType;
  }
  return null;
}

function parseReadFilter(raw: string | null): boolean | null {
  if (!raw || raw === "all") return null;
  if (raw === "unread") return false;
  if (raw === "read") return true;
  return null;
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    const locale = await getRequestLocale(request);
    return NextResponse.json(
      { error: apiErrorMessage(locale, "unauthorized") },
      { status: 401 },
    );
  }

  const locale = await getRequestLocale(request);
  const messages = await getMessages({ locale });

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "15")),
  );
  const typeFilter = parseNotificationTypeFilter(
    request.nextUrl.searchParams.get("type"),
  );
  const readFilter = parseReadFilter(request.nextUrl.searchParams.get("read"));

  const where = {
    userId,
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(readFilter !== null ? { read: readFilter } : {}),
  };

  const total = await prisma.notification.count({ where });
  const unreadTotal = await prisma.notification.count({
    where: { userId, read: false },
  });

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const rows = await Promise.all(
    notifications.map((n) =>
      serializeNotificationForLocale(n, locale, messages as Record<string, unknown>),
    ),
  );

  const hasMore = page * limit < total;

  return NextResponse.json({
    notifications: rows,
    total,
    unreadTotal,
    page,
    limit,
    hasMore,
  });
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "notifications-mark-all",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  if (data?.markAllRead !== true) {
    return jsonErrorKey(request, 400, "invalidAction");
  }

  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
