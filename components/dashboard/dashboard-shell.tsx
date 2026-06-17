"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gamepad2,
  UserRound,
  Bell,
  Newspaper,
  ShoppingBag,
  ShieldCheck,
  Crown,
  Headphones,
  Package,
  Shield,
  LogOut,
  Menu,
  X,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { dashboardNav } from "@/lib/navigation";
import { confirmPresets } from "@/lib/confirm-presets";
import { secureApi } from "@/lib/api/client";
import { useUser } from "@/lib/hooks/use-user";
import { getAvatarInitials } from "@/lib/profile";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Gamepad2,
  UserRound,
  Bell,
  Newspaper,
  ShoppingBag,
  ShieldCheck,
  Crown,
  Headphones,
  Package,
  Shield,
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage =
    dashboardNav.find((item) => pathname === item.href) ?? dashboardNav[0];

  const initials = user
    ? getAvatarInitials(user.firstName, user.lastName, user.nickname)
    : "??";

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
          "fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-border glass-menu transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo />
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {dashboardNav.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const active = pathname === item.href;
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
            {user?.isAdmin && (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground"
                      : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                  )}
                >
                  <Shield className="h-4.5 w-4.5 shrink-0 text-primary" />
                  Admin
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="border-t border-border p-4 space-y-2">
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            Voltar ao site
          </Link>
          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display text-sm font-bold text-white">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {user?.nickname ?? "Jogador"}
              </p>
              <p className="truncate text-xs text-muted capitalize">
                Plano {user?.plan ?? "free"}
              </p>
            </div>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-muted"
            confirm={confirmPresets.logout}
            onClick={async () => {
              await secureApi("/api/auth/logout", { method: "POST" });
              setUser(null);
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
        <header className="sticky top-0 z-30 border-b border-border glass-menu px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Área do jogador
                </p>
                <h1 className="font-display text-lg font-bold text-foreground sm:text-xl">
                  {currentPage.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink
                href="/"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex normal-case tracking-normal"
              >
                <Globe className="h-4 w-4" />
                Site
              </ButtonLink>
              <NotificationsDropdown />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="relative min-w-0 w-full overflow-x-clip px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="min-w-0 w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
