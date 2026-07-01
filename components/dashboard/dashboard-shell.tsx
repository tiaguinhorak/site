"use client";

import { Suspense } from "react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { StoreCartDrawer, StoreCartFab } from "@/components/dashboard/store-cart-drawer";
import { StoreCartProvider } from "@/lib/hooks/use-store-cart";
import { RouteKey } from "@/components/layout/route-key";
import { FriendsChatDock } from "@/components/dashboard/friends-chat-dock";
import { RankedInviteToast } from "@/components/dashboard/ranked-invite-toast";

function StoreCartUi() {
  return (
    <>
      <StoreCartFab />
      <StoreCartDrawer />
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <StoreCartProvider>
        <div className="relative min-h-dvh bg-background">
          <div
            className="pointer-events-none fixed inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed -left-40 top-0 h-[28rem] w-[28rem] rounded-full opacity-40 blur-[120px]"
            style={{ background: "var(--glow-1)" }}
            aria-hidden
          />

          <DashboardNavbar />

          <main className="relative min-w-0 w-full overflow-x-clip pb-8 pt-[5.5rem] sm:pt-[6rem] sm:pb-10">
            <RouteKey className="min-w-0 w-full">{children}</RouteKey>
          </main>

          <StoreCartUi />
          <FriendsChatDock />
          <RankedInviteToast />
        </div>
      </StoreCartProvider>
    </Suspense>
  );
}
