import "server-only";

import type { StoreItemReward } from "@/lib/generated/prisma/client";

type WeightedReward = Pick<StoreItemReward, "id" | "weight">;

export function pickWeightedStoreReward<T extends WeightedReward>(
  rewards: T[],
): T | null {
  if (rewards.length === 0) return null;
  const total = rewards.reduce((sum, row) => sum + Math.max(0, row.weight), 0);
  if (total <= 0) return rewards[0] ?? null;

  let roll = Math.random() * total;
  for (const reward of rewards) {
    roll -= Math.max(0, reward.weight);
    if (roll <= 0) return reward;
  }
  return rewards[rewards.length - 1] ?? null;
}

export function pickWeightedStoreRewardExcluding<T extends WeightedReward>(
  rewards: T[],
  excludedIds: Set<string>,
  maxAttempts = 12,
): T | null {
  let pool = rewards.filter((row) => !excludedIds.has(row.id));
  if (pool.length === 0) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const picked = pickWeightedStoreReward(pool);
    if (!picked) return null;
    if (!excludedIds.has(picked.id)) return picked;
    pool = pool.filter((row) => row.id !== picked.id);
    if (pool.length === 0) return null;
  }

  return pickWeightedStoreReward(pool);
}
