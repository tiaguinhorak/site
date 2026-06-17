"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Shield,
  Gavel,
  Bell,
  Server,
  ScrollText,
  Newspaper,
  ShoppingBag,
  Gamepad2,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { adminNav } from "@/lib/navigation";
import { confirmPresets } from "@/lib/confirm-presets";
import { secureApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  Users,
  Gavel,
  Bell,
  Server,
  ScrollText,
  Newspaper,
  ShoppingBag,
  Gamepad2,
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage =
    adminNav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
    adminNav[0];

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="relative min-h-dvh bg-background">
      <div
        className="pointer-events-none fixed inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        aria-hidden
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="glass-scrim fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "glass-menu fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-border transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <button
            type="button"
            className="lg:hidden"
            aria-label="Fechar"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {adminNav.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                        : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0 text-primary" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2 normal-case tracking-normal"
            confirm={confirmPresets.logout}
            onClick={async () => {
              await secureApi("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="glass-menu sticky top-0 z-30 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setSidebarOpen(true)}
                className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Painel administrativo
                </p>
                <h1 className="truncate font-display text-lg font-bold sm:text-xl">
                  {currentPage.title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <Logo showWord={false} />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <p className="mb-6 text-sm text-muted">{currentPage.description}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
