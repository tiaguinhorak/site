"use client";

import { motion } from "motion/react";
import { Signal, Play, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { useConfirmPresets } from "@/lib/use-confirm-presets";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { formatConnectAddress, steamConnectUrl } from "@/lib/servers/connect";
import {
  getServerConnectEligibility,
  serverConnectHref,
} from "@/lib/servers/connect-eligibility";
import { formatMapLabel } from "@/lib/servers/maps";
import { useLiveServerStats } from "@/lib/hooks/use-live-server-stats";
import { cn } from "@/lib/utils";

export type ServerRowView = {
  name: string;
  map: string;
  mode: string;
  players: number;
  slots: number;
  ping: number;
  host?: string | null;
  port?: number | null;
  isLiveSynced?: boolean;
};

function pingColor(ping: number) {
  if (ping <= 13) return "text-emerald-400";
  if (ping <= 18) return "text-amber-400";
  return "text-rose-400";
}

export function Servers({
  embedded = false,
  servers,
}: {
  embedded?: boolean;
  servers: ServerRowView[];
}) {
  const t = useTranslations("marketing");
  const confirmPresets = useConfirmPresets();
  const { authenticated, steamLinked } = useAuthSession();
  const hasLiveServers = servers.some((server) => server.isLiveSynced);
  const { statsByKey } = useLiveServerStats(hasLiveServers);

  const eligibility = getServerConnectEligibility(authenticated, steamLinked);
  const canSteamConnect = eligibility === "connect";

  return (
    <section
      id={embedded ? undefined : "servidores"}
      className={cn(embedded ? "" : "relative scroll-mt-24 py-24")}
    >
      <div className={cn(embedded ? "" : "mx-auto max-w-6xl px-4 sm:px-6")}>
        {!embedded && (
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow={t("servidoresEyebrow")}
              title={
                <>
                  {t("servidoresTitleA")}{" "}
                  <span className="text-gradient">{t("servidoresTitleB")}</span>
                </>
              }
              description={t("servidoresDesc")}
            />
            <ButtonLink
              href={authenticated ? "/dashboard" : "/register"}
              variant="outline"
              size="md"
              className="shrink-0"
            >
              {t("viewAllServers", { count: 65 })}
              <ChevronRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className={cn(
            "overflow-hidden rounded-card glass-strong",
            !embedded && "mt-10",
          )}
        >
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_1.2fr_0.8fr_auto] gap-4 border-b border-border px-6 py-4 font-display text-xs font-semibold uppercase tracking-wider text-muted md:grid">
            <span>{t("colServer")}</span>
            <span>{t("colMap")}</span>
            <span>{t("colMode")}</span>
            <span>{t("colPlayers")}</span>
            <span>{t("colPing")}</span>
            <span className="text-right">{t("colAction")}</span>
          </div>

          <ul>
            {servers.map((server, i) => {
              const connectAddress = formatConnectAddress(server.host, server.port);
              const liveStat = connectAddress ? statsByKey[connectAddress] : undefined;
              const players = liveStat?.players ?? server.players;
              const slots = liveStat?.slots ?? server.slots;
              const ping = liveStat?.ping ?? server.ping;
              const mapLabel = formatMapLabel(liveStat?.map ?? server.map);
              const isOffline = liveStat ? !liveStat.online : server.map === "offline";
              const full = players >= slots && slots > 0;
              const pct = slots > 0 ? Math.min((players / slots) * 100, 100) : 0;
              const steamUrl = canSteamConnect ? steamConnectUrl(server.host, server.port) : null;
              const canDirectConnect = Boolean(
                canSteamConnect && connectAddress && steamUrl && !isOffline,
              );
              const fallbackHref = serverConnectHref(eligibility, "/servidores");
              return (
                <motion.li
                  key={server.isLiveSynced ? `${server.name}-${connectAddress}` : server.name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="group grid grid-cols-2 items-center gap-4 border-b border-border px-6 py-4 transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_7%,transparent)] md:grid-cols-[1.6fr_1fr_1fr_1.2fr_0.8fr_auto]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        isOffline ? "bg-zinc-500" : full ? "bg-rose-500" : "bg-emerald-400",
                        !full && !isOffline && "animate-pulse-glow",
                      )}
                    />
                    <span className="font-display text-sm font-semibold text-foreground">
                      {server.name}
                    </span>
                    {canDirectConnect && (
                      <span className="hidden font-mono text-[10px] text-muted lg:inline">
                        {connectAddress}
                      </span>
                    )}
                  </div>

                  <span className="hidden font-mono text-sm text-muted md:block">
                    {mapLabel}
                  </span>

                  <span className="hidden md:block">
                    <span className="rounded-md bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {server.mode}
                    </span>
                  </span>

                  <div className="col-start-2 row-start-1 md:col-auto md:row-auto">
                    <div className="flex items-center justify-end gap-2 md:justify-start">
                      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] sm:block">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary-soft),var(--primary))]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm text-foreground">
                        {isOffline ? "—" : `${players}/${slots}`}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "hidden items-center gap-1 font-mono text-sm md:flex",
                      isOffline ? "text-muted" : pingColor(ping),
                    )}
                  >
                    <Signal className="h-3.5 w-3.5" />
                    {isOffline ? "—" : `${ping}ms`}
                  </span>

                  <div className="col-span-2 mt-2 md:col-auto md:mt-0 md:text-right">
                    {canDirectConnect ? (
                      <ButtonLink
                        href={steamUrl!}
                        variant="primary"
                        size="sm"
                        className="w-full md:w-auto"
                        confirm={
                          canSteamConnect
                            ? confirmPresets.connectServer(server.name, server.mode)
                            : undefined
                        }
                      >
                        <Play className="h-3.5 w-3.5" />
                        {t("connect")}
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        href={fallbackHref}
                        variant={full ? "outline" : "primary"}
                        size="sm"
                        className="w-full md:w-auto"
                        confirm={
                          canSteamConnect
                            ? full
                              ? confirmPresets.joinQueue(server.name)
                              : confirmPresets.connectServer(server.name, server.mode)
                            : undefined
                        }
                      >
                        <Play className="h-3.5 w-3.5" />
                        {full ? t("queue") : t("connect")}
                      </ButtonLink>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
