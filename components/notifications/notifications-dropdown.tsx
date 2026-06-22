"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GlassPortal } from "@/components/ui/glass-portal";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { requestBrowserNotificationPermission } from "@/components/notifications/browser-notification-listener";
import { notificationTypeStyles } from "@/components/notifications/notification-type-styles";
import { useNotificationNavigation } from "@/components/notifications/use-notification-navigation";
import { cn } from "@/lib/utils";

type NotificationsDropdownProps = {
  className?: string;
  align?: "left" | "right";
};

export function NotificationsDropdown({
  className,
  align = "right",
}: NotificationsDropdownProps) {
  const { authenticated } = useAuthSession();
  const t = useTranslations("notificationsDropdown");
  const tNotif = useTranslations("notifications");

  function typeLabel(type: string) {
    try {
      return tNotif(`type.${type}` as "type.system");
    } catch {
      return type;
    }
  }
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, markRead, markAllRead, refresh } =
    useNotifications({
      enabled: authenticated,
      pollMs: 60000,
      query: { limit: 8, page: 1 },
    });
  const openNotification = useNotificationNavigation();

  async function toggleOpen() {
    if (!open && authenticated) {
      await requestBrowserNotificationPermission();
      refresh();
    }
    setOpen((value) => !value);
  }

  if (!authenticated) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl glass-chip text-foreground transition-colors hover:glow-ring-contained"
        aria-label={t("ariaLabel")}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <GlassPortal
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align={align}
        width={380}
        scrimLabel={t("scrimLabel")}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <p className="font-display text-sm font-bold text-foreground">
            {t("title")}
            {unreadCount > 0 && (
              <span className="ml-2 text-xs font-normal text-primary">
                {t("newCount", { count: unreadCount })}
              </span>
            )}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="normal-case tracking-normal"
            disabled={unreadCount === 0}
            onClick={() => {
              if (unreadCount > 0) markAllRead();
            }}
          >
            <CheckCheck className="h-4 w-4" />
            {t("markRead")}
          </Button>
        </div>

        <ul className="max-h-[min(70vh,320px)] overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() =>
                  openNotification(n, markRead, { closeDropdown: () => setOpen(false) })
                }
                className={cn(
                  "w-full border-b border-border/80 px-4 py-3 text-left transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
                  !n.read && "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                      notificationTypeStyles[n.type] ?? notificationTypeStyles.system,
                    )}
                  >
                    {typeLabel(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{n.time}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            </li>
          ))}
          {notifications.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted">
              {t("empty")}
            </li>
          )}
        </ul>

        <div className="border-t border-border/80 px-4 py-2.5">
          <Link
            href="/dashboard/notificacoes"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
      </GlassPortal>
    </div>
  );
}
