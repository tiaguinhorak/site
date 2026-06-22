import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { getSessionUserId } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { type Locale } from "@/lib/i18n";
import { getMessages } from "next-intl/server";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import { parseContentTranslations } from "@/lib/i18n-content";
import { resolveNotificationContentForLocale } from "@/lib/i18n/auto-resolve-content";
import {
  formatRelativeTime,
  resolveNotificationText,
} from "@/lib/notifications/format";

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

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const rows = await Promise.all(
    notifications.map(async (n) => {
      const params =
        n.params && typeof n.params === "object" && !Array.isArray(n.params)
          ? (n.params as Record<string, string>)
          : {};
      const storedTranslations = parseContentTranslations(n.translations);

      let title = n.title;
      let body = n.body;

      if (n.titleKey) {
        const resolved = resolveNotificationText(
          locale,
          messages as Record<string, unknown>,
          n.title,
          n.body,
          n.titleKey,
          n.bodyKey,
          params,
          storedTranslations,
        );
        title = resolved.title;
        body = resolved.body;
      } else {
        const resolved = await resolveNotificationContentForLocale(
          locale,
          n.title,
          n.body,
          storedTranslations,
        );
        title = resolved.title;
        body = resolved.body;
      }

      return {
        id: n.id,
        title,
        body,
        read: n.read,
        type: n.type.toLowerCase(),
        time: formatRelativeTime(n.createdAt, locale),
        createdAt: n.createdAt.toISOString(),
      };
    }),
  );

  return NextResponse.json({ notifications: rows });
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
    const locale = await getRequestLocale(request);
    return NextResponse.json(
      { error: apiErrorMessage(locale, "unauthorized") },
      { status: 401 },
    );
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
