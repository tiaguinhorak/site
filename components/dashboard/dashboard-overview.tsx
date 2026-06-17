"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { GameModesSection } from "@/components/dashboard/game-modes-section";
import { InventoryPreview } from "@/components/dashboard/inventory-section";
import { confirmPresets } from "@/lib/confirm-presets";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

const quickLinks = [
  { href: "/dashboard/inventario", label: "Inventário completo", description: "Trocar facas, luvas e skins" },
  { href: "/dashboard/loja", label: "Loja", description: "Novos pacotes e cosméticos" },
  { href: "/dashboard/anticheat", label: "Anticheat", description: "Download e instalação" },
  { href: "/dashboard/suporte", label: "Suporte", description: "Ajuda e atendimento" },
];

const notificationTypeStyles: Record<string, string> = {
  system: "bg-violet-500/15 text-violet-400",
  match: "bg-emerald-500/15 text-emerald-400",
  social: "bg-fuchsia-500/15 text-fuchsia-400",
  promo: "bg-amber-500/15 text-amber-400",
};

export function DashboardOverview() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body: string; time: string; read: boolean; type: string }>
  >([]);
  const [featuredStore, setFeaturedStore] = useState<{
    name: string;
    description: string;
    price: string;
    badge: string;
    accent: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/notifications", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setNotifications((d.notifications ?? []).slice(0, 3)));
    fetch("/api/store")
      .then((r) => r.json())
      .then((d) => {
        const featured = (d.items ?? []).find((i: { featured: boolean }) => i.featured);
        if (featured) setFeaturedStore(featured);
      });
  }, []);

  const quickStats = user
    ? [
        { label: "Rank global", value: `#${user.rank}` },
        { label: "ELO", value: user.elo },
        { label: "K/D", value: user.kd.toFixed(2) },
        { label: "Plano", value: user.plan },
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Modos de jogo
            </h2>
            <p className="mt-1 text-sm text-muted">
              Conecte direto ao melhor servidor — sem sair da visão geral.
            </p>
          </div>
          <Link href="/dashboard/modos" className="text-sm font-medium text-primary hover:underline">
            Ver todos os modos
          </Link>
        </div>
        <GameModesSection />
      </div>

      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Equipado agora
            </h2>
            <p className="mt-1 text-sm text-muted">Suas skins ativas nos servidores clutchclube.</p>
          </div>
          <Link href="/dashboard/inventario" className="text-sm font-medium text-primary hover:underline">
            Inventário completo
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
              Ver na loja
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div>
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Notificações recentes
            </h2>
            <Link href="/dashboard/notificacoes" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <ul className="overflow-hidden rounded-card glass-strong">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-border px-5 py-4 last:border-0">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                      notificationTypeStyles[n.type] ?? notificationTypeStyles.system,
                    )}
                  >
                    {n.type}
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{n.time}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-6 font-display text-xl font-bold text-foreground sm:text-2xl">
          Acesso rápido
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
        <div className="rounded-card border border-primary/30 bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] p-6">
          <h3 className="font-display text-lg font-bold text-foreground">Upgrade Premium</h3>
          <p className="mt-2 text-sm text-muted">
            Slot reservado, +10k skins e prioridade no Quick Connect.
          </p>
          <ButtonLink href="/dashboard/premium" variant="primary" size="sm" className="mt-4">
            Ver planos
          </ButtonLink>
        </div>
      )}

      {user && !user.anticheatInstalled && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-foreground">
            Anticheat não detectado. Instale para jogar no modo competitivo.
          </p>
          <ButtonLink
            href="/dashboard/anticheat"
            variant="outline"
            size="sm"
            confirm={confirmPresets.downloadAnticheat}
          >
            Instalar agora
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
