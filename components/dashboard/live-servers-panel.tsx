"use client";

import Link from "next/link";
import { Server, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveServerCard } from "@/components/admin/live-server-manage-panel";
import { useLiveServerStats } from "@/lib/hooks/use-live-server-stats";
import { useUser } from "@/lib/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveServersPanel() {
  const t = useTranslations("liveServers");
  const { user } = useUser();
  const isAdmin = user?.isAdmin === true;
  const { statsByKey, loading, refresh } = useLiveServerStats(true, "ranked");
  const servers = Object.values(statsByKey);
  const onlineCount = servers.filter((s) => s.online).length;

  if (loading && servers.length === 0) {
    return (
      <div className="rounded-card glass-strong p-6" aria-busy="true">
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (servers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-card glass-strong p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-emerald-400" />
          <h2 className="font-display text-xl font-bold text-foreground">{t("title")}</h2>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            {t("onlineCount", { count: onlineCount })}
          </span>
        </div>
        {isAdmin && (
          <Link
            href="/admin/infra-csgo"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gerenciar infra
          </Link>
        )}
      </div>
      <p className="mb-5 text-sm text-muted">
        {t("updateNote")}
        {isAdmin && (
          <span className="mt-1 block text-xs">
            Como admin, clique em Editar no servidor para mudar nome, modo ou mapa.
          </span>
        )}
      </p>
      <ul className="space-y-4">
        {servers.map((server) => (
          <LiveServerCard
            key={server.id}
            server={server}
            isAdmin={isAdmin}
            onAdminAction={() => void refresh()}
          />
        ))}
      </ul>
    </div>
  );
}
