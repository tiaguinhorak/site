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
  href: string;
  params: Record<string, string>;
};

export type NotificationListMeta = {
  total: number;
  unreadTotal: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

type NotificationQuery = {
  page?: number;
  limit?: number;
  type?: string;
  read?: "all" | "unread" | "read";
};

function buildQueryString(query?: NotificationQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.type && query.type !== "all") params.set("type", query.type);
  if (query.read && query.read !== "all") params.set("read", query.read);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useNotifications(options?: {
  pollMs?: number;
  enabled?: boolean;
  query?: NotificationQuery;
}) {
  const pathname = usePathname();
  const enabled = options?.enabled ?? true;
  const query = options?.query;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<NotificationListMeta>({
    total: 0,
    unreadTotal: 0,
    page: 1,
    limit: 15,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/notifications${buildQueryString(query)}`, {
      credentials: "same-origin",
    });
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
    setMeta({
      total: data.total ?? 0,
      unreadTotal: data.unreadTotal ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 15,
      hasMore: data.hasMore ?? false,
    });
    setLoading(false);
  }, [enabled, query?.page, query?.limit, query?.type, query?.read]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    if (!enabled || !options?.pollMs) return;
    const id = window.setInterval(refresh, options.pollMs);
    return () => window.clearInterval(id);
  }, [enabled, options?.pollMs, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onRefresh = () => void refresh();
    window.addEventListener("clutch:notifications-refresh", onRefresh);
    return () => window.removeEventListener("clutch:notifications-refresh", onRefresh);
  }, [enabled, refresh]);

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

  const unreadCount = meta.unreadTotal;

  return {
    notifications,
    meta,
    loading,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
  };
}

export async function fetchNotificationById(id: string): Promise<NotificationItem | null> {
  const res = await fetch(`/api/notifications/${id}`, { credentials: "same-origin" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.notification ?? null;
}
