import "server-only";

import { creditCoins, type DbClient } from "@/lib/economy/wallet";
import { levelForXp } from "@/lib/progression/xp-curve";

export type MatchProgressionStats = {
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  mvp: number;
};

export type MatchProgressionRewards = {
  xp: number;
  coins: number;
};

const XP_BASE_PLAY = 120;
const XP_WIN_BONUS = 150;
const XP_LOSS_BONUS = 50;
const XP_PER_KILL = 8;
const XP_PER_ASSIST = 3;
const XP_PER_MVP = 40;

const COIN_BASE_PLAY = 25;
const COIN_WIN_BONUS = 40;
const COIN_LOSS_BONUS = 10;
const COIN_PER_KILL = 2;
const COIN_PER_MVP = 15;

/** Pure computation of XP and coin rewards for a finished ranked match. */
export function computeMatchProgression(stats: MatchProgressionStats): MatchProgressionRewards {
  const kills = Math.max(0, stats.kills);
  const assists = Math.max(0, stats.assists);
  const mvp = Math.max(0, stats.mvp);

  const xp =
    XP_BASE_PLAY +
    (stats.won ? XP_WIN_BONUS : XP_LOSS_BONUS) +
    kills * XP_PER_KILL +
    assists * XP_PER_ASSIST +
    mvp * XP_PER_MVP;

  const coins =
    COIN_BASE_PLAY +
    (stats.won ? COIN_WIN_BONUS : COIN_LOSS_BONUS) +
    kills * COIN_PER_KILL +
    mvp * COIN_PER_MVP;

  return { xp, coins };
}

export type GrantedMatchProgression = {
  xpGained: number;
  coinsGained: number;
  newLevel: number;
  leveledUp: boolean;
};

/**
 * Apply XP + coins for a finished match inside an existing transaction.
 * Recomputes the stored level from total XP and records a coin ledger entry.
 */
export async function grantMatchProgression(
  client: DbClient,
  userId: string,
  stats: MatchProgressionStats,
): Promise<GrantedMatchProgression> {
  const rewards = computeMatchProgression(stats);

  const before = await client.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });
  if (!before) {
    return { xpGained: 0, coinsGained: 0, newLevel: 1, leveledUp: false };
  }

  const newXp = before.xp + rewards.xp;
  const newLevel = levelForXp(newXp);
  const leveledUp = newLevel > before.level;

  await client.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel },
  });

  await creditCoins(client, {
    userId,
    amount: rewards.coins,
    kind: "EARN_MATCH",
    reason: stats.won ? "Vitória em partida ranqueada" : "Partida ranqueada concluída",
    metadata: {
      xpGained: rewards.xp,
      won: stats.won,
      kills: stats.kills,
      mvp: stats.mvp,
    },
  });

  return {
    xpGained: rewards.xp,
    coinsGained: rewards.coins,
    newLevel,
    leveledUp,
  };
}
