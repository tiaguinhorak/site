"use client";

import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
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

      <main className="relative min-w-0 w-full overflow-x-clip px-4 pb-8 pt-[5.5rem] sm:px-6 sm:pt-[6rem] sm:pb-10 lg:px-8">
        <div className="min-w-0 w-full">{children}</div>
      </main>
    </div>
  );
}
