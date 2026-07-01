"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RankedPartyProvider } from "@/components/providers/ranked-party-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { FriendsProvider } from "@/components/providers/friends-provider";
import { isRankedPlayRoute } from "@/lib/ranked/polling";

function needsPlayModeProviders(pathname: string): boolean {
  return (
    isRankedPlayRoute(pathname) ||
    pathname === "/dashboard/lobby" ||
    pathname.startsWith("/dashboard/lobby/")
  );
}

/**
 * RealtimeProvider (SSE) + FriendsProvider run across the whole dashboard so
 * presence, direct messages and ranked invites work everywhere.
 * The heavier RankedPartyProvider (ranked polling) stays scoped to lobby/ranked
 * routes only.
 */
export function DashboardProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const playMode = needsPlayModeProviders(pathname);

  return (
    <RealtimeProvider>
      <FriendsProvider>
        {playMode ? <RankedPartyProvider>{children}</RankedPartyProvider> : children}
      </FriendsProvider>
    </RealtimeProvider>
  );
}
