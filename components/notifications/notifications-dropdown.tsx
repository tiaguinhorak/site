"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { requestBrowserNotificationPermission } from "@/components/notifications/browser-notification-listener";
import { cn } from "@/lib/utils";

const notificationTypeStyles: Record<string, string> = {
  system: "bg-violet-500/15 text-violet-400",
  match: "bg-emerald-500/15 text-emerald-400",
  social: "bg-fuchsia-500/15 text-fuchsia-400",
  promo: "bg-amber-500/15 text-amber-400",
};

type NotificationsDropdownProps = {
  className?: string;
  align?: "left" | "right";
};

export function NotificationsDropdown({
  className,
  align = "right",
}: NotificationsDropdownProps) {
  const { authenticated } = useAuthSession();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, refresh } =
    useNotifications({ enabled: authenticated, pollMs: 60000 });

  async function toggleOpen() {
    if (!open && authenticated) {
      await requestBrowserNotificationPermission();
      refresh();
    }
    setOpen((v) => !v);
  }

  if (!authenticated) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-[color-mix(in_srgb,var(--card)_60%,transparent)] text-foreground transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
        aria-label="Notificações"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="glass-scrim fixed inset-0 z-40"
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl glass-menu shadow-2xl",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-display text-sm font-bold text-foreground">
                Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
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
                Marcar lidas
              </Button>
            </div>

            <ul className="max-h-[min(70vh,320px)] overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!n.read) await markRead(n.id);
                    }}
                    className={cn(
                      "w-full border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
                      !n.read && "bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                          notificationTypeStyles[n.type] ?? notificationTypeStyles.system,
                        )}
                      >
                        {n.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold text-foreground">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.body}</p>
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
                  Sem notificações
                </li>
              )}
            </ul>

            <div className="border-t border-border px-4 py-2.5">
              <Link
                href="/dashboard/notificacoes"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-medium text-primary hover:underline"
              >
                Ver todas no dashboard
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
