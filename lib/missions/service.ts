import "server-only";

import type { MissionMetric, MissionPeriod } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { creditCoins } from "@/lib/economy/wallet";
import { grantXp } from "@/lib/progression/grant-xp";
import { ensurePeriodMissions } from "@/lib/missions/generator";
import { periodKeyFor } from "@/lib/missions/period";

export type MissionView = {
  id: string;
  code: string;
  period: MissionPeriod;
  metric: MissionMetric;
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

export class MissionClaimError extends Error {}

async function ensureMissionsReady(): Promise<void> {
  await ensurePeriodMissions();
}

function activePeriodFilter() {
  const periods = ["DAILY", "WEEKLY", "MONTHLY"] as MissionPeriod[];
  return periods.map((period) => ({
    period,
    periodKey: periodKeyFor(period),
    enabled: true,
  }));
}

/** Merged view of every active mission for the user in the current period windows. */
export async function listUserMissions(userId: string): Promise<MissionView[]> {
  await ensureMissionsReady();

  const definitions = await prisma.missionDefinition.findMany({
    where: {
      enabled: true,
      OR: activePeriodFilter().map(({ period, periodKey }) => ({ period, periodKey })),
    },
    orderBy: [{ period: "asc" }, { sortOrder: "asc" }],
  });

  const keyByPeriod = new Map<MissionPeriod, string>();
  for (const period of ["DAILY", "WEEKLY", "MONTHLY"] as MissionPeriod[]) {
    keyByPeriod.set(period, periodKeyFor(period));
  }

  const userMissions = await prisma.userMission.findMany({
    where: {
      userId,
      OR: definitions.map((d) => ({
        missionId: d.id,
        periodKey: keyByPeriod.get(d.period)!,
      })),
    },
  });
  const progressByMission = new Map(userMissions.map((um) => [um.missionId, um]));

  return definitions.map((d) => {
    const um = progressByMission.get(d.id);
    return {
      id: d.id,
      code: d.code,
      period: d.period,
      metric: d.metric,
      title: d.title,
      description: d.description,
      icon: d.icon,
      target: d.target,
      progress: Math.min(um?.progress ?? 0, d.target),
      completed: um?.completed ?? false,
      claimed: um?.claimed ?? false,
      rewardXp: d.rewardXp,
      rewardCoins: d.rewardCoins,
    };
  });
}

export type MetricDeltas = Partial<Record<MissionMetric, number>>;

/** Advance mission progress after a match. Returns codes that became completed. */
export async function applyMissionProgress(
  userId: string,
  deltas: MetricDeltas,
): Promise<string[]> {
  await ensureMissionsReady();

  const metrics = Object.entries(deltas)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([metric]) => metric as MissionMetric);
  if (metrics.length === 0) return [];

  const definitions = await prisma.missionDefinition.findMany({
    where: {
      enabled: true,
      metric: { in: metrics },
      OR: activePeriodFilter().map(({ period, periodKey }) => ({ period, periodKey })),
    },
  });
  if (definitions.length === 0) return [];

  const newlyCompleted: string[] = [];

  for (const def of definitions) {
    const delta = deltas[def.metric] ?? 0;
    if (delta <= 0) continue;

    const periodKey = periodKeyFor(def.period);
    const existing = await prisma.userMission.findUnique({
      where: {
        userId_missionId_periodKey: { userId, missionId: def.id, periodKey },
      },
    });

    const prevProgress = existing?.progress ?? 0;
    if (existing?.completed) continue;

    const nextProgress = Math.min(prevProgress + delta, def.target);
    const completed = nextProgress >= def.target;

    await prisma.userMission.upsert({
      where: {
        userId_missionId_periodKey: { userId, missionId: def.id, periodKey },
      },
      create: {
        userId,
        missionId: def.id,
        periodKey,
        progress: nextProgress,
        target: def.target,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        progress: nextProgress,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) newlyCompleted.push(def.code);
  }

  return newlyCompleted;
}

export type MissionClaimResult = {
  missionCode: string;
  rewardXp: number;
  rewardCoins: number;
  coinBalance: number;
};

/** Claim the reward for a completed mission in the current period. */
export async function claimMission(
  userId: string,
  missionId: string,
): Promise<MissionClaimResult> {
  const def = await prisma.missionDefinition.findUnique({ where: { id: missionId } });
  if (!def) throw new MissionClaimError("Missão não encontrada.");

  const periodKey = periodKeyFor(def.period);

  const result = await prisma.$transaction(async (tx) => {
    const um = await tx.userMission.findUnique({
      where: {
        userId_missionId_periodKey: { userId, missionId: def.id, periodKey },
      },
    });
    if (!um || !um.completed) {
      throw new MissionClaimError("Missão ainda não concluída.");
    }
    if (um.claimed) {
      throw new MissionClaimError("Recompensa já resgatada.");
    }

    await tx.userMission.update({
      where: { id: um.id },
      data: { claimed: true, claimedAt: new Date() },
    });

    await grantXp(tx, userId, def.rewardXp);
    const wallet = await creditCoins(tx, {
      userId,
      amount: def.rewardCoins,
      kind: "EARN_MISSION",
      reason: `Missão: ${def.title}`,
      metadata: { missionCode: def.code, periodKey },
    });

    return wallet.balance;
  });

  return {
    missionCode: def.code,
    rewardXp: def.rewardXp,
    rewardCoins: def.rewardCoins,
    coinBalance: result,
  };
}
