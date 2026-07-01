"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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
  CloudCog,
  Sparkles,
  ChevronDown,
  Zap,
  Flame,
  ImageIcon,
  Sliders,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  adminNavGroups,
  adminOverview,
  getAdminPageMeta,
  type AdminNavGroup,
} from "@/lib/navigation";
import { confirmPresets } from "@/lib/confirm-presets";
import { secureApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Gavel,
  Bell,
  Server,
  ScrollText,
  Newspaper,
  ShoppingBag,
  Gamepad2,
  CloudCog,
  Sparkles,
  ImageIcon,
  Zap,
  Flame,
  Sliders,
};

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, group: AdminNavGroup) {
  return group.items.some((item) => isActive(pathname, item.href));
}

function AdminNavDropdown({
  group,
  pathname,
  isOpen,
  onToggle,
  onClose,
}: {
  group: AdminNavGroup;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = iconMap[group.icon] ?? LayoutDashboard;
  const active = groupIsActive(pathname, group);

  useEffect(() => {
    if (!isOpen) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
          active || isOpen
            ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
            : "text-muted hover:text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="hidden xl:inline">{group.label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-[calc(100%+6px)] z-[70] min-w-[13rem] overflow-hidden rounded-xl border border-border glass-menu p-1 shadow-2xl"
          >
            {group.items.map((item) => {
              const ItemIcon = iconMap[item.icon] ?? LayoutDashboard;
              const itemActive = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  role="menuitem"
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    itemActive
                      ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
                      : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground",
                  )}
                >
                  <ItemIcon className="h-4 w-4 shrink-0 text-primary" />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const page = getAdminPageMeta(pathname);

  const OverviewIcon = iconMap[adminOverview.icon] ?? LayoutDashboard;
  const overviewActive = isActive(pathname, adminOverview.href);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav
          className={cn(
            "relative z-[52] mx-auto flex w-full max-w-[1400px] items-center gap-2 rounded-2xl px-3 py-2.5 sm:gap-3 sm:px-4",
            "glass-strong glow-ring",
          )}
        >
          <div className="flex shrink-0 items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <Logo className="shrink-0" />
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 md:flex">
            <Link
              href={adminOverview.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                overviewActive
                  ? "text-foreground bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
                  : "text-muted hover:text-foreground hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
              )}
            >
              <OverviewIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="hidden lg:inline">{adminOverview.label}</span>
            </Link>

            {adminNavGroups.map((group) => (
              <AdminNavDropdown
                key={group.id}
                group={group}
                pathname={pathname}
                isOpen={openDropdown === group.id}
                onToggle={() =>
                  setOpenDropdown((prev) => (prev === group.id ? null : group.id))
                }
                onClose={() => setOpenDropdown(null)}
              />
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <ButtonLink
              href="/dashboard"
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex normal-case tracking-normal"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </ButtonLink>
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex normal-case tracking-normal"
              confirm={confirmPresets.logout}
              onClick={async () => {
                await secureApi("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <button
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Fechar menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="scrim-dismiss fixed inset-0 z-[48] md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="glass-menu relative z-[51] mx-auto mt-3 max-h-[min(85vh,calc(100dvh-5.5rem))] max-w-[1400px] overflow-y-auto rounded-2xl p-3 md:hidden"
              >
                <Link
                  href={adminOverview.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium",
                    overviewActive
                      ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                      : "text-muted",
                  )}
                >
                  <OverviewIcon className="h-4.5 w-4.5 text-primary" />
                  {adminOverview.label}
                </Link>
                {adminNavGroups.map((group) => {
                  const Icon = iconMap[group.icon] ?? LayoutDashboard;
                  return (
                    <details key={group.id} className="group mt-1">
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-muted [&::-webkit-details-marker]:hidden">
                        <Icon className="h-4.5 w-4.5 text-primary" />
                        <span className="flex-1">{group.label}</span>
                        <ChevronDown className="h-4 w-4 group-open:rotate-180" />
                      </summary>
                      <ul className="mb-1 space-y-0.5 pl-2">
                        {group.items.map((item) => {
                          const ItemIcon = iconMap[item.icon] ?? LayoutDashboard;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium",
                                  isActive(pathname, item.href)
                                    ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground"
                                    : "text-muted",
                                )}
                              >
                                <ItemIcon className="h-4 w-4 text-primary" />
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <ButtonLink
                    href="/dashboard"
                    variant="outline"
                    size="md"
                    className="w-full normal-case tracking-normal"
                    onClick={() => setMobileOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao dashboard
                  </ButtonLink>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 pt-[5.75rem] sm:px-6 sm:pt-[6.25rem]">
        <div className="mb-6">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Painel administrativo
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{page.title}</h1>
          <p className="mt-1 text-sm text-muted">{page.description}</p>
        </div>
      </div>
    </>
  );
}
