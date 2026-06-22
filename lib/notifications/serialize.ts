import "server-only";

import type { Notification } from "@/lib/generated/prisma/client";
import type { Locale } from "@/lib/i18n";
import { resolveNotificationContentForLocale } from "@/lib/i18n/auto-resolve-content";
import { parseContentTranslations } from "@/lib/i18n-content";
import {
  formatRelativeTime,
  resolveNotificationText,
} from "@/lib/notifications/format";
import {
  parseNotificationParams,
  resolveNotificationHref,
} from "@/lib/notifications/navigation";

type MessageCatalog = Record<string, unknown>;

export type SerializedNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  time: string;
  createdAt: string;
  href: string;
  params: Record<string, string>;
};

export async function serializeNotificationForLocale(
  n: Notification,
  locale: Locale,
  messages: MessageCatalog,
): Promise<SerializedNotification> {
  const params = parseNotificationParams(n.params);
  const storedTranslations = parseContentTranslations(n.translations);

  let title = n.title;
  let body = n.body;

  if (n.titleKey) {
    const resolved = resolveNotificationText(
      locale,
      messages,
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

  const type = n.type.toLowerCase();
  const href = resolveNotificationHref(type, { ...params, notificationId: n.id });

  return {
    id: n.id,
    title,
    body,
    read: n.read,
    type,
    time: formatRelativeTime(n.createdAt, locale),
    createdAt: n.createdAt.toISOString(),
    href,
    params,
  };
}
