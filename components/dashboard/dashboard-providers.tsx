"use client";

import type { ReactNode } from "react";
import { RankedPartyProvider } from "@/components/providers/ranked-party-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

/** Ranked + realtime polling only inside dashboard — not on marketing pages. */
export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <RealtimeProvider>
      <RankedPartyProvider>{children}</RankedPartyProvider>
    </RealtimeProvider>
  );
}
