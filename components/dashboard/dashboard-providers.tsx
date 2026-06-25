"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RankedPartyProvider } from "@/components/providers/ranked-party-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { isRankedPlayRoute } from "@/lib/ranked/polling";

function needsPlayModeProviders(pathname: string): boolean {
  return (
    isRankedPlayRoute(pathname) ||
    pathname === "/dashboard/lobby" ||
    pathname.startsWith("/dashboard/lobby/")
  );
}

/**
 * Ranked party + SSE realtime only on lobby/ranked routes.
 * Overview/inventário/etc. must not poll ranked APIs or open EventSource.
 */
export function DashboardProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!needsPlayModeProviders(pathname)) {
    return children;
  }

  return (
    <RealtimeProvider>
      <RankedPartyProvider>{children}</RankedPartyProvider>
    </RealtimeProvider>
  );
}
