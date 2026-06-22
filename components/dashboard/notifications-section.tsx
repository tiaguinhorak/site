"use client";

import { motion } from "motion/react";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

const notificationTypeStyles: Record<string, string> = {
  system: "bg-violet-500/15 text-violet-400",
  match: "bg-emerald-500/15 text-emerald-400",
  social: "bg-fuchsia-500/15 text-fuchsia-400",
  promo: "bg-amber-500/15 text-amber-400",
};

export function NotificationsSection() {
  const t = useTranslations("notifications");
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications({
    pollMs: 60000,
  });

  function typeLabel(type: string) {
    const key = `type.${type}` as "type.system";
    try {
      return t(key);
    } catch {
      return type;
    }
  }

  return (
    <section className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="normal-case tracking-normal"
            disabled={unreadCount === 0}
            onClick={() => {
              if (unreadCount > 0) markAllRead();
            }}
          >
            <CheckCheck className="h-4 w-4" />
            {t("markAllRead")}
          </Button>
        </div>
      )}

      <ul className="overflow-hidden rounded-card glass-strong">
        {notifications.map((n, i) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
          >
            <button
              type="button"
              onClick={() => {
                if (!n.read) markRead(n.id);
              }}
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
                <p className="mt-1 text-sm text-muted">{n.body}</p>
                <p className="mt-2 text-xs text-muted">{n.time}</p>
              </div>
              {!n.read && (
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          </motion.li>
        ))}
        {notifications.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-muted">
            {t("empty")}
          </li>
        )}
      </ul>
    </section>
  );
}
