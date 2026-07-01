"use client";

import { useCallback, useEffect, useState } from "react";
import { secureApi } from "@/lib/api/client";
import {
  fetchNotificationsDeduped,
  invalidateNotificationsCache,
} from "@/lib/notifications/client-cache";

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

  const refresh = useCallback(async (force = false) => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const payload = await fetchNotificationsDeduped(
      buildQueryString(query),
      force ? 0 : 12_000,
    );
    if (!payload) return;

    setNotifications(payload.notifications);
    setMeta(payload.meta);
    setLoading(false);
  }, [enabled, query?.page, query?.limit, query?.type, query?.read]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void fetchNotificationsDeduped(buildQueryString(query)).then((payload) => {
      if (!payload) {
        setLoading(false);
        return;
      }
      setNotifications(payload.notifications);
      setMeta(payload.meta);
      setLoading(false);
    });
  }, [enabled, query?.page, query?.limit, query?.type, query?.read]);

  useEffect(() => {
    if (!enabled || !options?.pollMs) return;
    const id = window.setInterval(refresh, options.pollMs);
    return () => window.clearInterval(id);
  }, [enabled, options?.pollMs, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onRefresh = () => void refresh(true);
    window.addEventListener("clutch:notifications-refresh", onRefresh);
    return () => window.removeEventListener("clutch:notifications-refresh", onRefresh);
  }, [enabled, refresh]);

  const markRead = useCallback(async (id: string) => {
    const result = await secureApi(`/api/notifications/${id}`, {
      method: "PATCH",
      json: { read: true },
    });
    if (result.ok) {
      invalidateNotificationsCache();
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
      invalidateNotificationsCache();
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
