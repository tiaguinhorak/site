"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GlassPortal } from "@/components/ui/glass-portal";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { secureApi } from "@/lib/api/client";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";
import { useUser } from "@/lib/hooks/use-user";
import { useTheme } from "@/lib/theme";
import { AvatarImage } from "@/components/ui/avatar-image";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function AccountDropdown({ className }: Props) {
  const router = useRouter();
  const { user, setUser } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("account");
  const tNav = useTranslations("nav");
  const confirmPresets = useConfirmPresets();

  if (!user) return null;

  const isDark = resolvedTheme === "dark";
  const avatarSrc = user.avatarUrl ?? getDefaultAvatarPresetUrl();

  const links = [
    { href: "/dashboard/perfil", label: t("profile"), icon: UserRound },
    { href: "/dashboard/perfil?tab=notifications", label: t("notificationSettings"), icon: Settings },
  ];

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={tNav("profile")}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl glass-chip py-1.5 pl-1.5 pr-2.5 transition-colors hover:glow-ring-contained"
      >
        <div className="flex h-8 w-8 shrink-0 overflow-hidden rounded-lg">
          <AvatarImage src={avatarSrc} size={32} className="rounded-lg" />
        </div>
        <span className="hidden max-w-[88px] truncate font-display text-sm font-semibold text-foreground md:block">
          {user.nickname}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      <GlassPortal
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align="right"
        width={320}
        scrimLabel={t("close")}
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
              <p className="truncate text-xs capitalize text-muted">
                {t("plan", { plan: user.plan ?? "free" })}
              </p>
            </div>
          </div>
        </div>

        <nav className="px-2 py-2">
          <ul className="space-y-0.5">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-border/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted">{t("theme")}</span>
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
              {isDark ? t("dark") : t("light")}
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-muted">{t("language")}</span>
            <LanguageSwitcher variant="stacked" className="w-full" />
          </div>
        </div>

        <div className="border-t border-border/80 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2 normal-case tracking-normal text-rose-600 dark:text-rose-300"
            confirm={confirmPresets.logout}
            onClick={async () => {
              setOpen(false);
              await secureApi("/api/auth/logout", { method: "POST" });
              setUser(null);
              notifyAuthSessionChanged();
              router.push("/login");
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
