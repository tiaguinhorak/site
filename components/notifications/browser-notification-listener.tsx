"use client";

import { useEffect, useRef } from "react";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { BRAND_ASSETS } from "@/lib/brand-assets";

const SEEN_KEY = "clutchclube-seen-notifications";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
}

function browserNotificationTarget(href: string, id: string): string {
  if (!href || href === "/dashboard/notificacoes") {
    return `/dashboard/notificacoes/${id}`;
  }
  return href;
}

export function BrowserNotificationListener() {
  const { authenticated } = useAuthSession();
  const { notifications } = useNotifications({
    enabled: authenticated,
    pollMs: 30000,
    query: { limit: 20, page: 1 },
  });
  const seenRef = useRef<Set<string>>(loadSeen());

  useEffect(() => {
    if (!authenticated || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    if (Notification.permission === "default") {
      const timer = window.setTimeout(() => {
        Notification.requestPermission().catch(() => undefined);
      }, 2500);
      return () => window.clearTimeout(timer);
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    if (Notification.permission !== "granted") return;

    for (const n of notifications) {
      if (n.read || seenRef.current.has(n.id)) continue;
      seenRef.current.add(n.id);
      try {
        const native = new Notification(n.title, {
          body: n.body,
          icon: BRAND_ASSETS.iconSmall,
          tag: n.id,
        });
        const target = browserNotificationTarget(n.href, n.id);
        native.onclick = () => {
          window.focus();
          window.location.assign(target);
        };
      } catch {
        // ignore blocked notifications
      }
    }
    saveSeen(seenRef.current);
  }, [authenticated, notifications]);

  return null;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
