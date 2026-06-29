import "server-only";

import { prisma } from "@/lib/prisma";

const CACHE_MS = 45 * 1000;

type EquippedRow = {
  skinId: string;
  equippedT: boolean;
  equippedCT: boolean;
};

const cache = new Map<string, { rows: EquippedRow[]; at: number }>();

export async function getEquippedRowsCached(steamId: string): Promise<EquippedRow[]> {
  const hit = cache.get(steamId);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.rows;
  }

  const rows = await prisma.csgoPlayerSkin.findMany({
    where: { steamId },
    select: { skinId: true, equippedT: true, equippedCT: true },
  });

  cache.set(steamId, { rows, at: Date.now() });
  return rows;
}

export function invalidateEquippedRowsCache(steamId: string): void {
  cache.delete(steamId);
}
