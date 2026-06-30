"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
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
        "flex flex-col gap-3 rounded-card glass p-4",
        mission.completed && !mission.claimed && "ring-1 ring-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">{mission.title}</p>
          <p className="mt-0.5 text-xs text-muted">{mission.description}</p>
        </div>
        {mission.claimed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
            <Check className="h-3 w-3" />
            {t("claimed")}
          </span>
        )}
      </div>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              mission.completed ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-primary-soft",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] text-muted">
          {Math.min(mission.progress, mission.target).toLocaleString("pt-BR")} /{" "}
          {mission.target.toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
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

  return (
    <div className="space-y-8">
      {PERIOD_ORDER.map((period) => {
        const list = missions.filter((m) => m.period === period);
        if (list.length === 0) return null;
        return (
          <section key={period}>
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">
              {t("period." + period)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
