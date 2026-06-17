"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { secureApi } from "@/lib/api/client";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: string;
  createdAt: string;
};

export function useNotifications(options?: { pollMs?: number; enabled?: boolean }) {
  const pathname = usePathname();
  const enabled = options?.enabled ?? true;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/notifications", { credentials: "same-origin" });
    if (res.status === 401) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    if (!enabled || !options?.pollMs) return;
    const id = window.setInterval(refresh, options.pollMs);
    return () => window.clearInterval(id);
  }, [enabled, options?.pollMs, refresh]);

  const markRead = useCallback(async (id: string) => {
    const result = await secureApi(`/api/notifications/${id}`, {
      method: "PATCH",
      json: { read: true },
    });
    if (result.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    }
    return result.ok;
  }, []);

  const markAllRead = useCallback(async () => {
    const result = await secureApi("/api/notifications", {
      method: "PATCH",
      json: { markAllRead: true },
    });
    if (result.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    return result.ok;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
  };
}
