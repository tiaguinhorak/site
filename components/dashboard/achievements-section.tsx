"use client";

import { useEffect, useState } from "react";
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
};

const TIER_STYLES: Record<AchievementTier, string> = {
  BRONZE: "from-amber-700/40 to-amber-500/20 text-amber-300",
  SILVER: "from-slate-400/40 to-slate-200/20 text-slate-200",
  GOLD: "from-yellow-500/40 to-yellow-300/20 text-yellow-300",
  PLATINUM: "from-cyan-400/40 to-cyan-200/20 text-cyan-200",
  DIAMOND: "from-fuchsia-500/40 to-violet-400/20 text-fuchsia-200",
};

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
        !achievement.unlocked && "opacity-90",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
            TIER_STYLES[achievement.tier],
          )}
        >
          {achievement.unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
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

  useEffect(() => {
    fetch("/api/achievements", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setAchievements(d.achievements ?? []))
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {t("summary", { unlocked: unlockedCount, total: achievements.length })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}
