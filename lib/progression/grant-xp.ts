import "server-only";

import type { DbClient } from "@/lib/economy/wallet";
import { levelForXp } from "@/lib/progression/xp-curve";

export type XpGrantResult = {
  xp: number;
  level: number;
  leveledUp: boolean;
};

/** Add XP to a user and recompute the stored level. Generic (missions, achievements, battle pass). */
export async function grantXp(
  client: DbClient,
  userId: string,
  amount: number,
): Promise<XpGrantResult> {
  const delta = Math.max(0, Math.floor(amount));
  const before = await client.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });
  if (!before) return { xp: 0, level: 1, leveledUp: false };
  if (delta === 0) {
    return { xp: before.xp, level: before.level, leveledUp: false };
  }

  const newXp = before.xp + delta;
  const newLevel = levelForXp(newXp);

  await client.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel },
  });

  return { xp: newXp, level: newLevel, leveledUp: newLevel > before.level };
}
