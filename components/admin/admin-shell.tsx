"use client";

import type { ReactNode } from "react";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { RouteKey } from "@/components/layout/route-key";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-background">
      <div
        className="pointer-events-none fixed inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-40 top-0 h-[28rem] w-[28rem] rounded-full opacity-30 blur-[120px]"
        style={{ background: "var(--glow-1)" }}
        aria-hidden
      />

      <AdminNavbar />

      <main className="layout-container relative pb-10 pt-24 sm:pt-28">
        <RouteKey>{children}</RouteKey>
      </main>
    </div>
  );
}
