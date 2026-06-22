"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import {
  fetchNotificationById,
  type NotificationItem,
} from "@/lib/hooks/use-notifications";
import { secureApi } from "@/lib/api/client";
import { notificationTypeStyles } from "@/components/notifications/notification-type-styles";
import { cn } from "@/lib/utils";

type NotificationDetailSectionProps = {
  id: string;
};

export function NotificationDetailSection({ id }: NotificationDetailSectionProps) {
  const t = useTranslations("notifications");
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchNotificationById(id).then((row) => {
      if (!active) return;
      setNotification(row);
      setLoading(false);
      if (row && !row.read) {
        secureApi(`/api/notifications/${id}`, {
          method: "PATCH",
          json: { read: true },
        }).catch(() => undefined);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  function typeLabel(type: string) {
    try {
      return t(`type.${type}` as "type.system");
    } catch {
      return type;
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted">{t("loading")}</p>
    );
  }

  if (!notification) {
    return (
      <div className="rounded-card glass-strong px-6 py-12 text-center">
        <p className="text-sm text-muted">{t("detail.notFound")}</p>
        <ButtonLink href="/dashboard/notificacoes" variant="outline" size="sm" className="mt-4">
          {t("detail.back")}
        </ButtonLink>
      </div>
    );
  }

  const showOpen =
    notification.href &&
    notification.href !== `/dashboard/notificacoes/${notification.id}`;

  return (
    <article className="rounded-card glass-strong p-6 sm:p-8">
      <Link
        href="/dashboard/notificacoes"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.back")}
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold uppercase",
            notificationTypeStyles[notification.type] ?? notificationTypeStyles.system,
          )}
        >
          {typeLabel(notification.type)}
        </span>
        <time className="text-xs text-muted">{notification.time}</time>
      </div>

      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
        {notification.title}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted whitespace-pre-wrap">
        {notification.body}
      </p>

      {showOpen && (
        <div className="mt-8">
          <ButtonLink href={notification.href} variant="primary" size="sm">
            <ExternalLink className="h-4 w-4" />
            {t("detail.openTarget")}
          </ButtonLink>
        </div>
      )}
    </article>
  );
}
