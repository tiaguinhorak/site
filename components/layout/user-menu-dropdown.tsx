"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Users,
  Crown,
  Trophy,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GlassPortal } from "@/components/ui/glass-portal";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { secureApi } from "@/lib/api/client";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";
import { useUser } from "@/lib/hooks/use-user";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import { useTheme } from "@/lib/theme";
import { AvatarImage } from "@/components/ui/avatar-image";
import { cn } from "@/lib/utils";

type UserMenuDropdownProps = {
  align?: "left" | "right";
  className?: string;
};

export function UserMenuDropdown({ align = "right", className }: UserMenuDropdownProps) {
  const router = useRouter();
  const { user, loading, setUser } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("userMenu");
  const tAccount = useTranslations("account");
  const tNav = useTranslations("nav");
  const confirmPresets = useConfirmPresets();

  if (loading || !user) return null;

  const planLabels: Record<string, string> = {
    free: t("planFree"),
    premium: t("planPremium"),
    elite: t("planElite"),
  };

  const avatarSrc =
    user.avatarUrl ?? user.steamAvatarUrl ?? getDefaultAvatarPresetUrl();
  const planLabel = planLabels[user.plan ?? "free"] ?? t("planFree");
  const isDark = resolvedTheme === "dark";

  const menuItems = [
    { href: "/dashboard/perfil", label: t("myProfile"), icon: UserRound },
    { href: "/dashboard/lobby", label: tNav("lobby"), icon: Users },
    { href: "/dashboard/ranked", label: t("ranked"), icon: Trophy },
    { href: "/dashboard/premium", label: t("subscription"), icon: Crown },
    { href: "/dashboard/perfil?tab=notifications", label: tAccount("notificationSettings"), icon: Settings },
  ];

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("label")}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-xl glass-chip py-1.5 pl-1.5 pr-2.5 transition-colors hover:glow-ring-contained",
          className?.includes("w-full") && "w-full justify-between",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 overflow-hidden rounded-lg">
          <AvatarImage src={avatarSrc} size={32} className="rounded-lg" />
        </div>
        <span className="hidden max-w-[100px] truncate font-display text-sm font-semibold text-foreground sm:block">
          {user.nickname}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <GlassPortal
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align={align}
        width={320}
        scrimLabel={tNav("closeMenu")}
      >
        <div className="border-b border-border/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 overflow-hidden rounded-xl">
              <AvatarImage src={avatarSrc} size={44} className="rounded-xl" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-foreground">
                {user.nickname}
              </p>
              <span className="mt-1 inline-flex rounded-md border border-border/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {planLabel}
              </span>
            </div>
          </div>
        </div>

        <ul className="py-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]"
                >
                  <Icon className="h-4 w-4 text-muted" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="my-1.5 border-t border-border/80" />
          <li>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]"
            >
              <LayoutDashboard className="h-4 w-4 text-muted" />
              {t("dashboard")}
            </Link>
          </li>
        </ul>

        <div className="space-y-3 border-t border-border/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted">{tAccount("theme")}</span>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:glow-ring"
            >
              {isDark ? (
                <Moon className="h-4 w-4 text-primary-soft" />
              ) : (
                <Sun className="h-4 w-4 text-primary" />
              )}
              {isDark ? tAccount("dark") : tAccount("light")}
            </button>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted">{tAccount("language")}</span>
            <LanguageSwitcher variant="stacked" className="w-full" />
          </div>
        </div>

        <div className="border-t border-border/80 p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 rounded-xl normal-case tracking-normal text-foreground"
            confirm={confirmPresets.logout}
            onClick={async () => {
              setOpen(false);
              await secureApi("/api/auth/logout", { method: "POST" });
              setUser(null);
              notifyAuthSessionChanged();
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </GlassPortal>
    </div>
  );
}
