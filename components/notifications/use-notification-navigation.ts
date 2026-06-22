"use client";

import { useRouter } from "next/navigation";
import type { NotificationItem } from "@/lib/hooks/use-notifications";

export function useNotificationNavigation() {
  const router = useRouter();

  return async function openNotification(
    n: NotificationItem,
    markRead: (id: string) => Promise<boolean>,
    options?: { closeDropdown?: () => void },
  ) {
    if (!n.read) {
      await markRead(n.id);
    }
    options?.closeDropdown?.();
    const target =
      !n.href || n.href === "/dashboard/notificacoes"
        ? `/dashboard/notificacoes/${n.id}`
        : n.href;
    router.push(target);
  };
}
