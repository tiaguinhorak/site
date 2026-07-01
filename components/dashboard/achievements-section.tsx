"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Award,
  Coins,
  Crosshair,
  Lock,
  Loader2,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type AchievementTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";

type Achievement = {
  id: string;
  code: string;
  tier: AchievementTier;
  title: string;
  description: string;
  icon: string | null;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  rewardXp: number;
  rewardCoins: number;
};

const ICONS: Record<string, LucideIcon> = {
  Swords,
  Trophy,
  Crosshair,
  Star,
  Sparkles,
  Award,
  Target,
  Coins,
};

const TIER_STYLES: Record<AchievementTier, string> = {
  BRONZE: "from-amber-700/50 to-amber-500/25 text-amber-300 border-amber-500/30",
  SILVER: "from-slate-400/50 to-slate-200/25 text-slate-200 border-slate-400/30",
  GOLD: "from-yellow-500/50 to-yellow-300/25 text-yellow-300 border-yellow-500/30",
  PLATINUM: "from-cyan-400/50 to-cyan-200/25 text-cyan-200 border-cyan-400/30",
  DIAMOND: "from-fuchsia-500/50 to-violet-400/25 text-fuchsia-200 border-fuchsia-500/30",
};

const TIER_ORDER: AchievementTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

function TrophyShowcase({ achievements }: { achievements: Achievement[] }) {
  const t = useTranslations("achievements");
  const unlocked = achievements.filter((a) => a.unlocked);

  if (unlocked.length === 0) {
    return (
      <div className="rounded-card glass-strong p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-muted/50" />
        <p className="mt-2 text-sm text-muted">{t("noTrophiesYet")}</p>
      </div>
    );
  }

  const featured = [...unlocked]
    .sort((a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier))
    .slice(0, 6);

  return (
    <div className="rounded-card glass-strong p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-foreground sm:text-lg">
        <Trophy className="h-5 w-5 text-amber-400" />
        {t("trophyShowcase")}
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {featured.map((a) => {
          const Icon = (a.icon && ICONS[a.icon]) || Award;
          return (
            <div
              key={a.id}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border bg-gradient-to-br p-3 text-center",
                TIER_STYLES[a.tier],
              )}
              title={a.title}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              <span className="line-clamp-2 text-[10px] font-semibold leading-tight sm:text-[11px]">
                {a.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const t = useTranslations("achievements");
  const Icon = (achievement.icon && ICONS[achievement.icon]) || Award;
  const pct = Math.min(100, Math.round((achievement.progress / achievement.threshold) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-card glass p-4",
        achievement.unlocked && "ring-1 ring-emerald-500/30",
        !achievement.unlocked && "opacity-90",
      )}
    >
      {achievement.unlocked && (
        <div className="absolute right-3 top-3">
          <Trophy className="h-4 w-4 text-amber-400/80" aria-hidden />
        </div>
      )}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br",
            TIER_STYLES[achievement.tier],
          )}
        >
          {achievement.unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-bold text-foreground">{achievement.title}</p>
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {t("tier." + achievement.tier)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{achievement.description}</p>
        </div>
      </div>

      {!achievement.unlocked && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-muted">
            {Math.min(achievement.progress, achievement.threshold).toLocaleString("pt-BR")} /{" "}
            {achievement.threshold.toLocaleString("pt-BR")}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1 text-primary">
          <Star className="h-3.5 w-3.5" />
          {achievement.rewardXp} XP
        </span>
        <span className="inline-flex items-center gap-1 text-amber-300">
          <Coins className="h-3.5 w-3.5" />
          {achievement.rewardCoins.toLocaleString("pt-BR")}
        </span>
        {achievement.unlocked && (
          <span className="ml-auto text-[11px] font-semibold uppercase text-emerald-400">
            {t("unlocked")}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function AchievementsSection() {
  const t = useTranslations("achievements");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<AchievementTier | "ALL">("ALL");

  useEffect(() => {
    fetch("/api/achievements", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setAchievements(d.achievements ?? []))
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false));
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const filtered = useMemo(() => {
    if (tierFilter === "ALL") return achievements;
    return achievements.filter((a) => a.tier === tierFilter);
  }, [achievements, tierFilter]);

  const tierCounts = useMemo(() => {
    const counts: Partial<Record<AchievementTier, number>> = {};
    for (const tier of TIER_ORDER) {
      counts[tier] = achievements.filter((a) => a.tier === tier && a.unlocked).length;
    }
    return counts;
  }, [achievements]);

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-card glass p-4 sm:p-5">
        <p className="text-sm text-muted">
          {t("summary", { unlocked: unlockedCount, total: achievements.length })}
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setTierFilter("ALL")}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
              tierFilter === "ALL"
                ? "bg-primary/15 text-primary"
                : "border border-border text-muted hover:text-foreground",
            )}
          >
            {t("filterAll")}
          </button>
          {TIER_ORDER.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                tierFilter === tier
                  ? "bg-primary/15 text-primary"
                  : "border border-border text-muted hover:text-foreground",
              )}
            >
              {t("tier." + tier)}
              <span className="ml-1 text-[10px] text-muted">({tierCounts[tier] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <TrophyShowcase achievements={achievements} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((a) => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}
