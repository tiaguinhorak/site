import "server-only";

import type { AchievementMetric, AchievementTier } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { creditCoins } from "@/lib/economy/wallet";
import { grantXp } from "@/lib/progression/grant-xp";
import { ensureAchievementsSeeded } from "@/lib/achievements/definitions";

type MetricSource = {
  matches: number;
  rankedWins: number;
  rankedKills: number;
  rankedAssists: number;
  level: number;
  lifetimeCoins: number;
  totalMvps: number;
};

async function loadMetricSource(userId: string, needMvps: boolean): Promise<MetricSource | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      matches: true,
      rankedWins: true,
      rankedKills: true,
      rankedAssists: true,
      level: true,
      lifetimeCoins: true,
    },
  });
  if (!user) return null;

  let totalMvps = 0;
  if (needMvps) {
    const agg = await prisma.rankedMatchPlayerStat.aggregate({
      where: { userId },
      _sum: { mvp: true },
    });
    totalMvps = agg._sum.mvp ?? 0;
  }

  return { ...user, totalMvps };
}

function metricValue(src: MetricSource, metric: AchievementMetric): number {
  switch (metric) {
    case "TOTAL_MATCHES":
      return src.matches;
    case "TOTAL_WINS":
      return src.rankedWins;
    case "TOTAL_KILLS":
      return src.rankedKills;
    case "TOTAL_ASSISTS":
      return src.rankedAssists;
    case "TOTAL_MVPS":
      return src.totalMvps;
    case "LEVEL":
      return src.level;
    case "LIFETIME_COINS":
      return src.lifetimeCoins;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

export type UnlockedAchievement = {
  code: string;
  title: string;
  tier: AchievementTier;
  icon: string | null;
  rewardXp: number;
  rewardCoins: number;
};

/** Evaluate lifetime achievements and unlock+grant any newly earned ones. */
export async function evaluateAchievements(userId: string): Promise<UnlockedAchievement[]> {
  await ensureAchievementsSeeded();

  const definitions = await prisma.achievementDefinition.findMany({
    where: { enabled: true },
  });
  if (definitions.length === 0) return [];

  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  const pending = definitions.filter((d) => !unlockedIds.has(d.id));
  if (pending.length === 0) return [];

  const needMvps = pending.some((d) => d.metric === "TOTAL_MVPS");
  const src = await loadMetricSource(userId, needMvps);
  if (!src) return [];

  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const def of pending) {
    if (metricValue(src, def.metric) < def.threshold) continue;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.userAchievement.create({
          data: { userId, achievementId: def.id },
        });
        await grantXp(tx, userId, def.rewardXp);
        await creditCoins(tx, {
          userId,
          amount: def.rewardCoins,
          kind: "EARN_ACHIEVEMENT",
          reason: `Conquista: ${def.title}`,
          metadata: { achievementCode: def.code },
        });
      });
      newlyUnlocked.push({
        code: def.code,
        title: def.title,
        tier: def.tier,
        icon: def.icon,
        rewardXp: def.rewardXp,
        rewardCoins: def.rewardCoins,
      });
    } catch {
      // Unique violation = already unlocked concurrently; ignore.
    }
  }

  return newlyUnlocked;
}

export type AchievementView = {
  id: string;
  code: string;
  metric: AchievementMetric;
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

/** Full achievement list with the viewer's progress + unlock state. */
export async function listUserAchievements(userId: string): Promise<AchievementView[]> {
  await ensureAchievementsSeeded();

  const definitions = await prisma.achievementDefinition.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });

  const unlocked = await prisma.userAchievement.findMany({ where: { userId } });
  const unlockedById = new Map(unlocked.map((u) => [u.achievementId, u]));

  const needMvps = definitions.some((d) => d.metric === "TOTAL_MVPS");
  const src = (await loadMetricSource(userId, needMvps)) ?? {
    matches: 0,
    rankedWins: 0,
    rankedKills: 0,
    rankedAssists: 0,
    level: 1,
    lifetimeCoins: 0,
    totalMvps: 0,
  };

  return definitions.map((d) => {
    const u = unlockedById.get(d.id);
    return {
      id: d.id,
      code: d.code,
      metric: d.metric,
      tier: d.tier,
      title: d.title,
      description: d.description,
      icon: d.icon,
      threshold: d.threshold,
      progress: Math.min(metricValue(src, d.metric), d.threshold),
      unlocked: Boolean(u),
      unlockedAt: u?.unlockedAt.toISOString() ?? null,
      rewardXp: d.rewardXp,
      rewardCoins: d.rewardCoins,
    };
  });
}

export type PublicMedal = {
  code: string;
  title: string;
  tier: AchievementTier;
  icon: string | null;
  unlockedAt: string;
};

/** Unlocked achievements for public profile medals (most recent first). */
export async function getPublicUserMedals(userId: string, limit = 12): Promise<PublicMedal[]> {
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
    take: Math.max(1, Math.min(limit, 50)),
    include: {
      achievement: {
        select: { code: true, title: true, tier: true, icon: true, enabled: true },
      },
    },
  });

  return rows
    .filter((r) => r.achievement.enabled)
    .map((r) => ({
      code: r.achievement.code,
      title: r.achievement.title,
      tier: r.achievement.tier,
      icon: r.achievement.icon,
      unlockedAt: r.unlockedAt.toISOString(),
    }));
}
