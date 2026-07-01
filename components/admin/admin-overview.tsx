"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SocialUserRow } from "@/components/social/social-user-row";
import { SocialUserName } from "@/components/social/social-user-name";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Crown,
  Activity,
  Ban,
  Gavel,
  Server,
  ScrollText,
  Newspaper,
  ShoppingBag,
  Gamepad2,
} from "lucide-react";
import { SteamIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Stats = {
  totalUsers: number;
  completeProfiles: number;
  incompleteProfiles: number;
  steamLinked: number;
  steamUnlinked: number;
  newToday: number;
  newWeek: number;
  newMonth: number;
  plans: { free: number; premium: number; elite: number };
  mfaEnabled: number;
  anticheatInstalled: number;
  activeBans: number;
  activePunishments: number;
  totalServers: number;
  totalNews: number;
  totalStoreItems: number;
  totalGameModes: number;
  recentUsers: Array<{
    id: string;
    nickname: string;
    email: string | null;
    steamPersonaName: string | null;
    steamId: string | null;
    plan: string;
    createdAt: string;
    avatarUrl: string | null;
    steamAvatarUrl: string | null;
  }>;
  recentAudit: Array<{
    id: string;
    summary: string;
    action: string;
    createdAt: string;
    admin: { nickname: string; steamPersonaName?: string | null; steamId?: string | null };
  }>;
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon | typeof SteamIcon;
  href?: string;
}) {
  const content = (
    <div className="rounded-card glass-strong p-5 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStats)
      .catch(() => setError("Não foi possível carregar as métricas."));
  }, []);

  if (error) {
    return <div className="rounded-card glass p-8 text-center text-rose-400">{error}</div>;
  }

  if (!stats) {
    return <div className="rounded-card glass p-8 text-center text-muted">Carregando métricas...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de usuários" value={stats.totalUsers} icon={Users} href="/admin/usuarios" />
        <StatCard label="Perfis completos" value={stats.completeProfiles} sub={`${stats.incompleteProfiles} incompletos`} icon={UserCheck} />
        <StatCard label="Steam vinculada" value={stats.steamLinked} sub={`${stats.steamUnlinked} sem Steam`} icon={SteamIcon} />
        <StatCard label="Novos (7 dias)" value={stats.newWeek} sub={`${stats.newToday} hoje`} icon={UserPlus} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Banimentos ativos" value={stats.activeBans} icon={Ban} href="/admin/punicoes" />
        <StatCard label="Punições ativas" value={stats.activePunishments} icon={Gavel} href="/admin/punicoes" />
        <StatCard label="Servidores" value={stats.totalServers} icon={Server} href="/admin/servidores" />
        <StatCard label="Premium+" value={stats.plans.premium + stats.plans.elite} icon={Crown} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Notícias" value={stats.totalNews} icon={Newspaper} href="/admin/noticias" />
        <StatCard label="Itens na loja" value={stats.totalStoreItems} icon={ShoppingBag} href="/admin/loja" />
        <StatCard label="Modos de jogo" value={stats.totalGameModes} icon={Gamepad2} href="/admin/modos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card glass-strong p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Planos</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Free", value: stats.plans.free, color: "text-muted" },
              { label: "Premium", value: stats.plans.premium, color: "text-primary" },
              { label: "Elite", value: stats.plans.elite, color: "text-amber-400" },
            ].map((p) => (
              <div key={p.label} className="rounded-xl border border-border p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-muted">{p.label}</p>
                <p className={cn("mt-2 font-display text-2xl font-bold", p.color)}>{p.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card glass-strong p-5">
          <h2 className="font-display text-lg font-bold">Segurança</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted">
                <ShieldCheck className="h-4 w-4 text-primary" />
                2FA ativo
              </span>
              <span className="font-semibold">{stats.mfaEnabled}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted">
                <Activity className="h-4 w-4 text-primary" />
                Anticheat
              </span>
              <span className="font-semibold">{stats.anticheatInstalled}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card glass-strong overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-lg font-bold">Cadastros recentes</h2>
          </div>
          <ul className="divide-y divide-border">
            {stats.recentUsers.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/admin/usuarios/${user.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                >
                  <SocialUserRow
                    user={user}
                    avatarSize="md"
                    nameClassName="text-sm font-semibold"
                    subtitle={
                      <p className="truncate text-xs text-muted">
                        {user.email ?? "Perfil incompleto"}
                      </p>
                    }
                    className="min-w-0 flex-1"
                  />
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-card glass-strong overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <ScrollText className="h-5 w-5 text-primary" />
              Auditoria recente
            </h2>
            <Link href="/admin/auditoria" className="text-xs text-primary hover:underline">Ver tudo</Link>
          </div>
          <ul className="divide-y divide-border">
            {stats.recentAudit.map((log) => (
              <li key={log.id} className="px-5 py-4">
                <p className="text-sm font-medium">{log.summary}</p>
                <p className="mt-1 text-xs text-muted">
                  <SocialUserName user={log.admin} nameClassName="text-xs" />
                  {" · "}
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
