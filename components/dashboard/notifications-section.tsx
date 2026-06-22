"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { notificationTypeStyles } from "@/components/notifications/notification-type-styles";
import { useNotificationNavigation } from "@/components/notifications/use-notification-navigation";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = ["all", "system", "match", "social", "promo"] as const;
const READ_FILTERS = ["all", "unread", "read"] as const;

export function NotificationsSection() {
  const t = useTranslations("notifications");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  const query = useMemo(
    () => ({
      page,
      limit: 12,
      type: typeFilter,
      read: readFilter,
    }),
    [page, typeFilter, readFilter],
  );

  const { notifications, meta, loading, unreadCount, markRead, markAllRead } =
    useNotifications({ pollMs: 60000, query });
  const openNotification = useNotificationNavigation();

  function typeLabel(type: string) {
    const key = `type.${type}` as "type.system";
    try {
      return t(key);
    } catch {
      return type;
    }
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setTypeFilter(filter);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "glass-chip text-muted hover:text-foreground",
              )}
            >
              {filter === "all" ? t("filter.all") : typeLabel(filter)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {READ_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setReadFilter(filter);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                readFilter === filter
                  ? "bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t(`filter.read.${filter}`)}
            </button>
          ))}
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="normal-case tracking-normal"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-4 w-4" />
              {t("markAllRead")}
            </Button>
          )}
        </div>
      </div>

      <ul className="overflow-hidden rounded-card glass-strong">
        {loading && notifications.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-muted">{t("loading")}</li>
        )}
        {notifications.map((n, i) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
          >
            <button
              type="button"
              onClick={() => openNotification(n, markRead)}
              className={cn(
                "flex w-full gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
                !n.read && "bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
              )}
            >
              <span
                className={cn(
                  "mt-1 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold uppercase",
                  notificationTypeStyles[n.type] ?? notificationTypeStyles.system,
                )}
              >
                {typeLabel(n.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-foreground">{n.title}</p>
                <p className="mt-1 text-sm text-muted line-clamp-2">{n.body}</p>
                <p className="mt-2 text-xs text-muted">{n.time}</p>
              </div>
              {!n.read && (
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          </motion.li>
        ))}
        {!loading && notifications.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-muted">{t("empty")}</li>
        )}
      </ul>

      {meta.total > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <p>{t("pagination.summary", { page: meta.page, total: totalPages, count: meta.total })}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("pagination.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("pagination.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
