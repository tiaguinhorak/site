import "server-only";

import type { MissionMetric, MissionPeriod } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type MissionSeed = {
  code: string;
  period: MissionPeriod;
  metric: MissionMetric;
  target: number;
  title: string;
  description: string;
  rewardXp: number;
  rewardCoins: number;
  icon: string;
  sortOrder: number;
};

export const DEFAULT_MISSIONS: MissionSeed[] = [
  // Daily
  { code: "daily_play_3", period: "DAILY", metric: "MATCHES_PLAYED", target: 3, title: "Aquecimento diário", description: "Jogue 3 partidas ranqueadas hoje.", rewardXp: 150, rewardCoins: 75, icon: "Swords", sortOrder: 1 },
  { code: "daily_win_2", period: "DAILY", metric: "MATCHES_WON", target: 2, title: "Vitórias do dia", description: "Vença 2 partidas ranqueadas hoje.", rewardXp: 180, rewardCoins: 90, icon: "Trophy", sortOrder: 2 },
  { code: "daily_kills_40", period: "DAILY", metric: "KILLS", target: 40, title: "Tiroteio", description: "Elimine 40 inimigos hoje.", rewardXp: 120, rewardCoins: 60, icon: "Crosshair", sortOrder: 3 },
  // Weekly
  { code: "weekly_play_15", period: "WEEKLY", metric: "MATCHES_PLAYED", target: 15, title: "Maratona semanal", description: "Jogue 15 partidas ranqueadas nesta semana.", rewardXp: 600, rewardCoins: 300, icon: "Swords", sortOrder: 1 },
  { code: "weekly_win_10", period: "WEEKLY", metric: "MATCHES_WON", target: 10, title: "Imparável", description: "Vença 10 partidas ranqueadas nesta semana.", rewardXp: 800, rewardCoins: 400, icon: "Trophy", sortOrder: 2 },
  { code: "weekly_mvp_5", period: "WEEKLY", metric: "MVPS", target: 5, title: "Destaque da semana", description: "Seja MVP em 5 partidas nesta semana.", rewardXp: 700, rewardCoins: 350, icon: "Star", sortOrder: 3 },
  // Monthly
  { code: "monthly_play_60", period: "MONTHLY", metric: "MATCHES_PLAYED", target: 60, title: "Veterano do mês", description: "Jogue 60 partidas ranqueadas neste mês.", rewardXp: 2000, rewardCoins: 1200, icon: "Swords", sortOrder: 1 },
  { code: "monthly_kills_800", period: "MONTHLY", metric: "KILLS", target: 800, title: "Caçador", description: "Elimine 800 inimigos neste mês.", rewardXp: 2500, rewardCoins: 1500, icon: "Crosshair", sortOrder: 2 },
];

let seeded = false;

/** Idempotently upsert the default mission catalog. Cached per process. */
export async function ensureMissionsSeeded(): Promise<void> {
  if (seeded) return;
  for (const m of DEFAULT_MISSIONS) {
    await prisma.missionDefinition.upsert({
      where: { code: m.code },
      create: {
        code: m.code,
        period: m.period,
        metric: m.metric,
        target: m.target,
        title: m.title,
        description: m.description,
        rewardXp: m.rewardXp,
        rewardCoins: m.rewardCoins,
        icon: m.icon,
        sortOrder: m.sortOrder,
      },
      update: {
        // Keep catalog content fresh, but never disable here.
        period: m.period,
        metric: m.metric,
        target: m.target,
        title: m.title,
        description: m.description,
        rewardXp: m.rewardXp,
        rewardCoins: m.rewardCoins,
        icon: m.icon,
        sortOrder: m.sortOrder,
      },
    });
  }
  seeded = true;
}
