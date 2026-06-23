"use client";

import Link from "next/link";
import { Server, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { LiveServerAdminActions } from "@/components/admin/live-server-admin-actions";
import { useLiveServerStats, type LiveServerStatView } from "@/lib/hooks/use-live-server-stats";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

function pingColor(ping: number) {
  if (ping <= 13) return "text-emerald-400";
  if (ping <= 25) return "text-amber-400";
  return "text-rose-400";
}

function ServerCard({
  server,
  isAdmin,
  onAdminAction,
}: {
  server: LiveServerStatView;
  isAdmin: boolean;
  onAdminAction: () => void;
}) {
  const t = useTranslations("liveServers");
  return (
    <li className="rounded-xl border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display font-semibold text-foreground">{server.name}</p>
          <p className="text-xs text-muted">
            {server.mode} · {server.map}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-foreground">
            {server.online ? `${server.players}/${server.slots}` : "—"}
          </span>
          <span className={cn("inline-flex items-center gap-1 font-mono", pingColor(server.ping))}>
            {server.online ? `${server.ping}ms` : "—"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              server.online ? "text-emerald-400" : "text-muted",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                server.online ? "animate-pulse bg-emerald-400" : "bg-zinc-500",
              )}
            />
            {server.online ? t("online") : t("offline")}
          </span>
        </div>
      </div>
      {server.online && <ServerConnectActions host={server.host} port={server.port} />}
      {isAdmin && (
        <LiveServerAdminActions
          serverName={server.name}
          csgoServerId={server.csgoServerId}
          online={server.online}
          onActionComplete={onAdminAction}
        />
      )}
    </li>
  );
}

export function LiveServersPanel() {
  const t = useTranslations("liveServers");
  const { user } = useUser();
  const isAdmin = user?.isAdmin === true;
  const { statsByKey, loading, refresh } = useLiveServerStats(true);
  const servers = Object.values(statsByKey);
  const onlineCount = servers.filter((s) => s.online).length;

  if (loading && servers.length === 0) {
    return null;
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
            Como admin, você pode derrubar servidores aqui ou abrir Infra CS:GO para controle completo.
          </span>
        )}
      </p>
      <ul className="space-y-4">
        {servers.map((server) => (
          <ServerCard
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
