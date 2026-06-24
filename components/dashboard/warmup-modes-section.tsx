"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Bomb,
  Crosshair,
  Gamepad2,
  Mountain,
  ScanFace,
  Server,
  Skull,
  Target,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveServerCard } from "@/components/admin/live-server-manage-panel";
import { useLiveServerStats } from "@/lib/hooks/use-live-server-stats";
import { useUser } from "@/lib/hooks/use-user";
import {
  WARMUP_MODES,
  type WarmupModeDef,
  type WarmupModeId,
  serverMatchesWarmupMode,
} from "@/lib/warmup/modes";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const WARMUP_ICONS: Record<string, LucideIcon> = {
  Boxes,
  Skull,
  Gamepad2,
  Crosshair,
  Target,
  ScanFace,
  Bomb,
  Waves,
  Users,
  Mountain,
};

function WarmupModeCard({
  mode,
  active,
  serverCount,
  onSelect,
}: {
  mode: WarmupModeDef;
  active: boolean;
  serverCount: number;
  onSelect: () => void;
}) {
  const Icon = WARMUP_ICONS[mode.icon] ?? Crosshair;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all",
        "min-h-[5.5rem] border-amber-500/35 bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
        "hover:border-amber-400/60 hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]",
        active && "border-amber-400 ring-2 ring-amber-400/30",
      )}
    >
      <Icon className="h-6 w-6 text-foreground/90 transition-transform group-hover:scale-110" />
      <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-foreground">
        {mode.label}
      </span>
      {serverCount > 0 && (
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
          {serverCount}
        </span>
      )}
    </button>
  );
}

export function WarmupModesSection() {
  const t = useTranslations("warmup");
  const { user } = useUser();
  const isAdmin = user?.isAdmin === true;
  const { statsByKey, loading, refresh } = useLiveServerStats(true, "warmup");
  const servers = Object.values(statsByKey);
  const [selectedModeId, setSelectedModeId] = useState<WarmupModeId | "all">("all");

  const countsByMode = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const mode of WARMUP_MODES) {
      counts[mode.id] = servers.filter((server) =>
        serverMatchesWarmupMode(server.mode, mode),
      ).length;
    }
    return counts;
  }, [servers]);

  const filteredServers =
    selectedModeId === "all"
      ? servers
      : servers.filter((server) => {
          const mode = WARMUP_MODES.find((entry) => entry.id === selectedModeId);
          return mode ? serverMatchesWarmupMode(server.mode, mode) : false;
        });

  const onlineCount = servers.filter((s) => s.online).length;

  if (loading && servers.length === 0) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-card glass-strong p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Server className="h-5 w-5 text-amber-400" />
          <h2 className="font-display text-xl font-bold text-foreground">{t("modesTitle")}</h2>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            {t("onlineCount", { count: onlineCount })}
          </span>
        </div>
        <p className="mb-4 text-sm text-muted">{t("modesDesc")}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <button
            type="button"
            onClick={() => setSelectedModeId("all")}
            className={cn(
              "rounded-xl border px-3 py-4 text-xs font-bold uppercase tracking-wide transition-all",
              selectedModeId === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:border-primary/40",
            )}
          >
            {t("allModes")}
          </button>
          {WARMUP_MODES.map((mode) => (
            <WarmupModeCard
              key={mode.id}
              mode={mode}
              active={selectedModeId === mode.id}
              serverCount={countsByMode[mode.id] ?? 0}
              onSelect={() => setSelectedModeId(mode.id)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-card glass-strong p-5">
        <h3 className="mb-4 font-display text-lg font-bold text-foreground">
          {selectedModeId === "all"
            ? t("serversTitleAll")
            : t("serversTitleMode", {
                mode: WARMUP_MODES.find((m) => m.id === selectedModeId)?.label ?? "",
              })}
        </h3>

        {filteredServers.length === 0 ? (
          <p className="text-sm text-muted">{t("noServers")}</p>
        ) : (
          <ul className="space-y-4">
            {filteredServers.map((server) => (
              <LiveServerCard
                key={server.id}
                server={server}
                isAdmin={isAdmin}
                onAdminAction={() => void refresh()}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
