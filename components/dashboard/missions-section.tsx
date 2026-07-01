"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  Check,
  Coins,
  Crosshair,
  Loader2,
  Star,
  Swords,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type MissionPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

type Mission = {
  id: string;
  code: string;
  period: MissionPeriod;
  title: string;
  description: string;
  icon: string | null;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardXp: number;
  rewardCoins: number;
};

const ICONS: Record<string, LucideIcon> = {
  Swords,
  Trophy,
  Crosshair,
  Star,
  Target,
};

const PERIOD_ORDER: MissionPeriod[] = ["DAILY", "WEEKLY", "MONTHLY"];

const PERIOD_ICONS: Record<MissionPeriod, LucideIcon> = {
  DAILY: Calendar,
  WEEKLY: Trophy,
  MONTHLY: Star,
};

function MissionCard({
  mission,
  claiming,
  onClaim,
}: {
  mission: Mission;
  claiming: boolean;
  onClaim: (mission: Mission) => void;
}) {
  const t = useTranslations("missions");
  const Icon = (mission.icon && ICONS[mission.icon]) || Target;
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex h-full flex-col gap-3 rounded-card glass p-4 transition-shadow",
        mission.completed && !mission.claimed && "ring-1 ring-primary/40 shadow-[0_0_24px_-8px_var(--primary)]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">{mission.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{mission.description}</p>
        </div>
        {mission.claimed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
            <Check className="h-3 w-3" />
            {t("claimed")}
          </span>
        )}
      </div>

      <div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              mission.completed ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-primary-soft",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
          <span>{pct}%</span>
          <span>
            {Math.min(mission.progress, mission.target).toLocaleString("pt-BR")} /{" "}
            {mission.target.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-primary">
            <Star className="h-3.5 w-3.5" />
            {mission.rewardXp} XP
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300">
            <Coins className="h-3.5 w-3.5" />
            {mission.rewardCoins.toLocaleString("pt-BR")}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          variant={mission.completed && !mission.claimed ? "primary" : "outline"}
          disabled={!mission.completed || mission.claimed || claiming}
          onClick={() => onClaim(mission)}
        >
          {claiming ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : mission.claimed ? (
            t("claimed")
          ) : mission.completed ? (
            t("claim")
          ) : (
            t("inProgress")
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export function MissionsSection() {
  const t = useTranslations("missions");
  const { refresh } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<MissionPeriod | "ALL">("ALL");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/missions", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setMissions(d.missions ?? []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = missions.filter((m) => m.completed).length;
    const claimable = missions.filter((m) => m.completed && !m.claimed).length;
    return { total: missions.length, completed, claimable };
  }, [missions]);

  async function handleClaim(mission: Mission) {
    if (claimingId) return;
    setClaimingId(mission.id);
    const result = await secureApi("/api/missions/" + mission.id + "/claim", { method: "POST" });
    setClaimingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("claimedToast"));
    load();
    void refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  const visiblePeriods =
    activePeriod === "ALL" ? PERIOD_ORDER : PERIOD_ORDER.filter((p) => p === activePeriod);

  return (
    <div className="space-y-6">
      <div className="rounded-card glass-strong p-4 sm:p-5">
        <p className="text-sm text-muted">
          {t("summary", {
            completed: stats.completed,
            total: stats.total,
            claimable: stats.claimable,
          })}
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActivePeriod("ALL")}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
              activePeriod === "ALL"
                ? "bg-primary/15 text-primary"
                : "border border-border text-muted hover:text-foreground",
            )}
          >
            {t("filterAll")}
          </button>
          {PERIOD_ORDER.map((period) => {
            const PeriodIcon = PERIOD_ICONS[period];
            const count = missions.filter((m) => m.period === period).length;
            return (
              <button
                key={period}
                type="button"
                onClick={() => setActivePeriod(period)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  activePeriod === period
                    ? "bg-primary/15 text-primary"
                    : "border border-border text-muted hover:text-foreground",
                )}
              >
                <PeriodIcon className="h-3.5 w-3.5" />
                {t("period." + period)}
                <span className="rounded-full bg-black/25 px-1.5 text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visiblePeriods.map((period) => {
        const list = missions.filter((m) => m.period === period);
        if (list.length === 0) return null;
        return (
          <section key={period}>
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-foreground sm:text-lg">
              {(() => {
                const PeriodIcon = PERIOD_ICONS[period];
                return <PeriodIcon className="h-5 w-5 text-primary" />;
              })()}
              {t("period." + period)}
              <span className="text-sm font-normal text-muted">
                {t("periodHint." + period)}
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  claiming={claimingId === m.id}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
