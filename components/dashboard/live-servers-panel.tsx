"use client";

import { Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { ServerConnectActions } from "@/components/ui/server-connect-actions";
import { useLiveServerStats, type LiveServerStatView } from "@/lib/hooks/use-live-server-stats";
import { cn } from "@/lib/utils";

function pingColor(ping: number) {
  if (ping <= 13) return "text-emerald-400";
  if (ping <= 25) return "text-amber-400";
  return "text-rose-400";
}

function ServerCard({ server }: { server: LiveServerStatView }) {
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
    </li>
  );
}

export function LiveServersPanel() {
  const t = useTranslations("liveServers");
  const { statsByKey, loading } = useLiveServerStats(true);
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
      <div className="mb-4 flex items-center gap-2">
        <Server className="h-5 w-5 text-emerald-400" />
        <h2 className="font-display text-xl font-bold text-foreground">{t("title")}</h2>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
          {t("onlineCount", { count: onlineCount })}
        </span>
      </div>
      <p className="mb-5 text-sm text-muted">
        {t("updateNote")}
      </p>
      <ul className="space-y-4">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </ul>
    </div>
  );
}
