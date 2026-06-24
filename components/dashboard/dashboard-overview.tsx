"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { PlayModePicker } from "@/components/dashboard/play-mode-picker";
import { RANKED_ANTICHEAT_REQUIRED } from "@/lib/ranked";
import { InventoryPreview } from "@/components/dashboard/inventory-section";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useUser } from "@/lib/hooks/use-user";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { notificationTypeStyles } from "@/components/notifications/notification-type-styles";
import { useNotificationNavigation } from "@/components/notifications/use-notification-navigation";
import { cn } from "@/lib/utils";

const notificationTypeStylesLocal = notificationTypeStyles;

export function DashboardOverview() {
  const { user } = useUser();
  const t = useTranslations("overview");
  const tNotif = useTranslations("notifications");
  const confirmPresets = useConfirmPresets();
  const { notifications, markRead } = useNotifications({
    query: { limit: 3, page: 1 },
  });
  const openNotification = useNotificationNavigation();

  function typeLabel(type: string) {
    try {
      return tNotif(`type.${type}` as "type.system");
    } catch {
      return type;
    }
  }
  const quickLinks = [
    { href: "/dashboard/lobby", label: t("quick.lobbyLabel"), description: t("quick.lobbyDesc") },
    { href: "/dashboard/warmup", label: t("quick.warmupLabel"), description: t("quick.warmupDesc") },
    { href: "/dashboard/ranked", label: t("quick.rankedLabel"), description: t("quick.rankedDesc") },
    { href: "/dashboard/ranking", label: t("quick.rankingLabel"), description: t("quick.rankingDesc") },
    { href: "/dashboard/inventario", label: t("quick.inventoryLabel"), description: t("quick.inventoryDesc") },
    { href: "/dashboard/loja", label: t("quick.storeLabel"), description: t("quick.storeDesc") },
    { href: "/dashboard/anticheat", label: t("quick.anticheatLabel"), description: t("quick.anticheatDesc") },
    { href: "/dashboard/suporte", label: t("quick.supportLabel"), description: t("quick.supportDesc") },
  ];
  const [featuredStore, setFeaturedStore] = useState<{
    name: string;
    description: string;
    price: string;
    badge: string;
    accent: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((d) => {
        const featured = (d.items ?? []).find((i: { featured: boolean }) => i.featured);
        if (featured) setFeaturedStore(featured);
      });
  }, []);

  const quickStats = user
    ? [
        { label: t("statRank"), value: `#${user.rank}` },
        { label: t("statElo"), value: user.elo },
        { label: t("statKd"), value: user.kd.toFixed(2) },
        { label: t("statPlan"), value: user.plan },
      ]
    : [];

  return (
    <div className="space-y-10 sm:space-y-12">
      {quickStats.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-card glass px-5 py-4">
              <p className="text-xs uppercase tracking-wider text-muted">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-bold capitalize text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div>
        <PlayModePicker />
      </div>

      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              {t("equippedNow")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("equippedDesc")}</p>
          </div>
          <Link href="/dashboard/inventario" className="text-sm font-medium text-primary hover:underline">
            {t("fullInventory")}
          </Link>
        </div>
        <InventoryPreview />
      </div>

      {featuredStore && (
        <div className="relative overflow-hidden rounded-card glass-strong p-6 sm:p-8">
          <div
            className={cn(
              "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br opacity-30 blur-3xl",
              featuredStore.accent,
            )}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Flame className="h-3.5 w-3.5" />
                {featuredStore.badge}
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
                {featuredStore.name}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">{featuredStore.description}</p>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">
                {featuredStore.price}
              </p>
            </div>
            <ButtonLink href="/dashboard/loja" variant="primary" size="lg" className="shrink-0">
              {t("viewInStore")}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div>
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              {t("recentNotifications")}
            </h2>
            <Link href="/dashboard/notificacoes" className="text-sm font-medium text-primary hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <ul className="overflow-hidden rounded-card glass-strong">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => openNotification(n, markRead)}
                  className={cn(
                    "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]",
                    !n.read && "bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                      notificationTypeStylesLocal[n.type] ?? notificationTypeStylesLocal.system,
                    )}
                  >
                    {typeLabel(n.type)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{n.time}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-6 font-display text-xl font-bold text-foreground sm:text-2xl">
          {t("quickAccess")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-card glass p-5 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
            >
              <p className="font-display font-semibold text-foreground">{link.label}</p>
              <p className="mt-1 text-sm text-muted">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {user?.plan === "free" && (
        <div className="rounded-card glass p-6">
          <h3 className="font-display text-lg font-bold text-foreground">{t("subscribeTitle")}</h3>
          <p className="mt-2 text-sm text-muted">{t("subscribeDesc")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/dashboard/ranked" variant="primary" size="sm">
              {t("rankedMode")}
            </ButtonLink>
            <ButtonLink href="/dashboard/premium" variant="outline" size="sm">
              {t("viewPlans")}
            </ButtonLink>
          </div>
        </div>
      )}

      {RANKED_ANTICHEAT_REQUIRED && user && !user.anticheatInstalled && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl glass border border-amber-400/30 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-foreground">{t("anticheatNotDetected")}</p>
          <ButtonLink
            href="/dashboard/anticheat"
            variant="outline"
            size="sm"
            confirm={confirmPresets.downloadAnticheat}
          >
            {t("installNow")}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
