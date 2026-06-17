"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Users,
  Crown,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmPresets } from "@/lib/confirm-presets";
import { secureApi } from "@/lib/api/client";
import { useUser } from "@/lib/hooks/use-user";
import { getAvatarInitials } from "@/lib/profile";
import { cn } from "@/lib/utils";

const planLabels: Record<string, string> = {
  free: "MEMBRO",
  premium: "PREMIUM",
  elite: "ELITE",
};

type UserMenuDropdownProps = {
  align?: "left" | "right";
  className?: string;
};

export function UserMenuDropdown({ align = "right", className }: UserMenuDropdownProps) {
  const router = useRouter();
  const { user, loading, setUser } = useUser();
  const [open, setOpen] = useState(false);

  if (loading || !user) return null;

  const initials = getAvatarInitials("", "", user.nickname);
  const avatarSrc = user.avatarUrl ?? user.steamAvatarUrl;
  const planLabel = planLabels[user.plan ?? "free"] ?? "MEMBRO";

  const menuItems = [
    { href: "/dashboard/perfil", label: "Meu perfil", icon: UserRound },
    { href: "/dashboard/modos", label: "Modos de jogo", icon: Users },
    { href: "/dashboard/premium", label: "Minha assinatura", icon: Crown },
    { href: "/dashboard/perfil", label: "Configurações", icon: Settings },
  ];

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu da conta"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/80 bg-[color-mix(in_srgb,var(--card)_50%,transparent)] py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
          className?.includes("w-full") && "w-full justify-between",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] text-xs font-bold text-white">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
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

      {open && (
        <>
          <button
            type="button"
            className="glass-scrim fixed inset-0 z-40"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute z-50 mt-2 w-[min(100vw-2rem,280px)] overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--background-soft)_95%,transparent)] shadow-2xl backdrop-blur-xl",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display text-sm font-bold text-white">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-foreground">
                    {user.nickname}
                  </p>
                  <span className="mt-1 inline-flex rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
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
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
                    >
                      <Icon className="h-4 w-4 text-muted" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="my-1.5 border-t border-border" />
              <li>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
                >
                  <LayoutDashboard className="h-4 w-4 text-muted" />
                  Dashboard
                </Link>
              </li>
            </ul>

            <div className="border-t border-border p-1.5">
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
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
