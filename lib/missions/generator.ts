import "server-only";

import type { MissionMetric, MissionPeriod } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { periodKeyFor } from "@/lib/missions/period";

type MissionTemplate = {
  metric: MissionMetric;
  icon: string;
  titles: string[];
  desc: (target: number) => string;
  targets: Record<MissionPeriod, number[]>;
  reward: Record<MissionPeriod, { xp: number; coins: number }>;
};

const PERIOD_SLOTS: Record<MissionPeriod, number> = {
  DAILY: 4,
  WEEKLY: 5,
  MONTHLY: 6,
};

/** Large combinatorial pool — each month picks a unique slice via deterministic hash. */
const TEMPLATES: MissionTemplate[] = [
  {
    metric: "MATCHES_PLAYED",
    icon: "Swords",
    titles: ["Aquecimento", "Na fila", "Sem parar", "Maratona", "Veterano", "Grind ranked"],
    desc: (t) => `Jogue ${t} partidas ranqueadas.`,
    targets: { DAILY: [2, 3, 4, 5], WEEKLY: [8, 12, 15, 18, 20], MONTHLY: [40, 55, 70, 85, 100, 120] },
    reward: { DAILY: { xp: 120, coins: 60 }, WEEKLY: { xp: 500, coins: 250 }, MONTHLY: { xp: 1800, coins: 900 } },
  },
  {
    metric: "MATCHES_WON",
    icon: "Trophy",
    titles: ["Vitória rápida", "Dominador", "Imparável", "Campeão", "Invicto", "Só vitória"],
    desc: (t) => `Vença ${t} partidas ranqueadas.`,
    targets: { DAILY: [1, 2, 3], WEEKLY: [5, 8, 10, 12], MONTHLY: [25, 35, 45, 55, 65] },
    reward: { DAILY: { xp: 150, coins: 80 }, WEEKLY: { xp: 650, coins: 350 }, MONTHLY: { xp: 2200, coins: 1200 } },
  },
  {
    metric: "KILLS",
    icon: "Crosshair",
    titles: ["Tiroteio", "Eliminador", "Headshot hunter", "Fragger", "Assassino", "Caçador"],
    desc: (t) => `Elimine ${t} inimigos.`,
    targets: { DAILY: [25, 35, 45, 55], WEEKLY: [120, 180, 240, 300], MONTHLY: [600, 800, 1000, 1200, 1400] },
    reward: { DAILY: { xp: 100, coins: 50 }, WEEKLY: { xp: 550, coins: 280 }, MONTHLY: { xp: 2000, coins: 1100 } },
  },
  {
    metric: "ASSISTS",
    icon: "Target",
    titles: ["Apoio tático", "Team player", "Setup kills", "Utility master", "Facilitador"],
    desc: (t) => `Registre ${t} assistências.`,
    targets: { DAILY: [10, 15, 20], WEEKLY: [40, 60, 80, 100], MONTHLY: [200, 300, 400, 500, 600] },
    reward: { DAILY: { xp: 90, coins: 45 }, WEEKLY: { xp: 480, coins: 240 }, MONTHLY: { xp: 1600, coins: 800 } },
  },
  {
    metric: "MVPS",
    icon: "Star",
    titles: ["Destaque", "MVP do dia", "Estrela", "Protagonista", "Carry", "MVP machine"],
    desc: (t) => `Seja MVP em ${t} partidas.`,
    targets: { DAILY: [1, 2], WEEKLY: [3, 5, 7, 9], MONTHLY: [15, 22, 30, 38, 45] },
    reward: { DAILY: { xp: 180, coins: 90 }, WEEKLY: { xp: 700, coins: 380 }, MONTHLY: { xp: 2500, coins: 1400 } },
  },
];

function periodOrdinal(period: MissionPeriod, periodKey: string): number {
  if (period === "DAILY") {
    const [y, m, d] = periodKey.split("-").map(Number);
    return y * 372 + m * 31 + d;
  }
  if (period === "WEEKLY") {
    const [y, wPart] = periodKey.split("-W");
    return Number(y) * 53 + Number(wPart);
  }
  const [y, m] = periodKey.split("-").map(Number);
  return y * 12 + m;
}

function pickIndex(ordinal: number, slot: number, used: Set<number>, poolSize: number): number {
  let attempt = 0;
  while (attempt < poolSize * 2) {
    const idx = (ordinal * 17 + slot * 31 + attempt * 13) % poolSize;
    if (!used.has(idx)) return idx;
    attempt += 1;
  }
  return slot % poolSize;
}

function pickTarget(template: MissionTemplate, period: MissionPeriod, ordinal: number, slot: number): number {
  const options = template.targets[period];
  const idx = (ordinal + slot * 7) % options.length;
  return options[idx];
}

function pickTitle(template: MissionTemplate, ordinal: number, slot: number): string {
  const idx = (ordinal + slot * 11) % template.titles.length;
  return template.titles[idx];
}

/** Generate fresh missions for the current period windows; disable stale ones. */
export async function ensurePeriodMissions(): Promise<void> {
  const periods: MissionPeriod[] = ["DAILY", "WEEKLY", "MONTHLY"];

  for (const period of periods) {
    const key = periodKeyFor(period);
    const slots = PERIOD_SLOTS[period];
    const ordinal = periodOrdinal(period, key);

    await prisma.missionDefinition.updateMany({
      where: {
        period,
        OR: [{ periodKey: { not: key } }, { periodKey: null }],
        enabled: true,
      },
      data: { enabled: false },
    });

    const existing = await prisma.missionDefinition.count({
      where: { period, periodKey: key, enabled: true },
    });
    if (existing >= slots) continue;

    const usedTemplates = new Set<number>();
    for (let slot = 0; slot < slots; slot += 1) {
      const code = `${period.toLowerCase()}_${key}_s${slot}`;
      const templateIdx = pickIndex(ordinal, slot, usedTemplates, TEMPLATES.length);
      usedTemplates.add(templateIdx);
      const template = TEMPLATES[templateIdx];
      const target = pickTarget(template, period, ordinal, slot);
      const title = pickTitle(template, ordinal, slot);
      const rewards = template.reward[period];

      await prisma.missionDefinition.upsert({
        where: { code },
        create: {
          code,
          period,
          periodKey: key,
          metric: template.metric,
          target,
          title,
          description: template.desc(target),
          rewardXp: rewards.xp + slot * 20,
          rewardCoins: rewards.coins + slot * 10,
          icon: template.icon,
          sortOrder: slot + 1,
          enabled: true,
        },
        update: {
          periodKey: key,
          metric: template.metric,
          target,
          title,
          description: template.desc(target),
          rewardXp: rewards.xp + slot * 20,
          rewardCoins: rewards.coins + slot * 10,
          icon: template.icon,
          sortOrder: slot + 1,
          enabled: true,
        },
      });
    }
  }
}
