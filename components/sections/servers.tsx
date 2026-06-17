"use client";

import { motion } from "motion/react";
import { Signal, Play, ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { confirmPresets } from "@/lib/confirm-presets";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { cn } from "@/lib/utils";

export type ServerRowView = {
  name: string;
  map: string;
  mode: string;
  players: number;
  slots: number;
  ping: number;
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
  const { authenticated, steamLinked } = useAuthSession();

  const connectHref = authenticated
    ? steamLinked
      ? "/dashboard"
      : "/api/auth/steam?mode=link"
    : "/login";

  return (
    <section
      id={embedded ? undefined : "servidores"}
      className={cn(embedded ? "" : "relative scroll-mt-24 py-24")}
    >
      <div className={cn(embedded ? "" : "mx-auto max-w-6xl px-4 sm:px-6")}>
        {!embedded && (
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow="Ao vivo"
              title={
                <>
                  Servidores de{" "}
                  <span className="text-gradient">alta performance</span>
                </>
              }
              description="Hospedados em São Paulo com links dedicados de 10 Gbps e 18ms de ping médio no Brasil."
            />
            <ButtonLink
              href={authenticated ? "/dashboard" : "/register"}
              variant="outline"
              size="md"
              className="shrink-0"
            >
              Ver todos os 65 servidores
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
            <span>Servidor</span>
            <span>Mapa</span>
            <span>Modo</span>
            <span>Jogadores</span>
            <span>Ping</span>
            <span className="text-right">Ação</span>
          </div>

          <ul>
            {servers.map((server, i) => {
              const full = server.players >= server.slots;
              const pct = Math.min((server.players / server.slots) * 100, 100);
              return (
                <motion.li
                  key={server.name}
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
                        full ? "bg-rose-500" : "bg-emerald-400",
                        !full && "animate-pulse-glow",
                      )}
                    />
                    <span className="font-display text-sm font-semibold text-foreground">
                      {server.name}
                    </span>
                  </div>

                  <span className="hidden font-mono text-sm text-muted md:block">
                    {server.map}
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
                        {server.players}/{server.slots}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "hidden items-center gap-1 font-mono text-sm md:flex",
                      pingColor(server.ping),
                    )}
                  >
                    <Signal className="h-3.5 w-3.5" />
                    {server.ping}ms
                  </span>

                  <div className="col-span-2 mt-2 md:col-auto md:mt-0 md:text-right">
                    <ButtonLink
                      href={connectHref}
                      variant={full ? "outline" : "primary"}
                      size="sm"
                      className="w-full md:w-auto"
                      confirm={
                        authenticated
                          ? full
                            ? confirmPresets.joinQueue(server.name)
                            : confirmPresets.connectServer(server.name, server.mode)
                          : undefined
                      }
                    >
                      <Play className="h-3.5 w-3.5" />
                      {full ? "Fila" : "Conectar"}
                    </ButtonLink>
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
