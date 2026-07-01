"use client";

import type { NotificationItem, NotificationListMeta } from "@/lib/hooks/use-notifications";

type CachedNotifications = {
  notifications: NotificationItem[];
  meta: NotificationListMeta;
};

type CacheEntry = {
  key: string;
  fetchedAt: number;
  data: CachedNotifications;
};

let cache: CacheEntry | null = null;
let inflight: Promise<CachedNotifications | null> | null = null;

const DEFAULT_META: NotificationListMeta = {
  total: 0,
  unreadTotal: 0,
  page: 1,
  limit: 15,
  hasMore: false,
};

function buildCacheKey(queryString: string): string {
  return queryString || "default";
}

export async function fetchNotificationsDeduped(
  queryString: string,
  maxAgeMs = 12_000,
): Promise<CachedNotifications | null> {
  const key = buildCacheKey(queryString);
  const now = Date.now();

  if (cache && cache.key === key && now - cache.fetchedAt < maxAgeMs) {
    return cache.data;
  }

  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const res = await fetch(`/api/notifications${queryString}`, {
        credentials: "same-origin",
      });

      if (res.status === 401) {
        return { notifications: [], meta: DEFAULT_META };
      }
      if (!res.ok) return null;

      const data = await res.json();
      const payload: CachedNotifications = {
        notifications: data.notifications ?? [],
        meta: {
          total: data.total ?? 0,
          unreadTotal: data.unreadTotal ?? 0,
          page: data.page ?? 1,
          limit: data.limit ?? 15,
          hasMore: data.hasMore ?? false,
        },
      };

      cache = { key, fetchedAt: Date.now(), data: payload };
      return payload;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function invalidateNotificationsCache(): void {
  cache = null;
}
