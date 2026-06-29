import "server-only";

/**
 * In-memory cache for csgoSkinCatalog rows and filtered counts.
 * The catalog is effectively static (only updated by sync jobs), so caching
 * for 10 minutes eliminates repeated full-table scans on every page navigation.
 */

import { prisma } from "@/lib/prisma";
import type { InventoryCategoryKey } from "@/lib/profile";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import type { RarityKey } from "@/lib/inventory/rarity-tiers";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type CatalogRowRaw = {
  id: string;
  category: string;
  rarity: string;
  imageUrl: string | null;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
};

type CacheEntry = {
  rows: CatalogRowRaw[];
  count: number;
  at: number;
};

const cache = new Map<string, CacheEntry>();

export type CatalogQueryParams = {
  category: InventoryCategoryKey | "all";
  search: string;
  weaponId: string;
  page: number;
  limit: number;
  team?: LoadoutTeam;
  dualTeamOnly: boolean;
  rarityTier?: RarityKey;
};

function cacheKey(p: CatalogQueryParams): string {
  return [
    p.category,
    p.page,
    p.limit,
    p.search.trim().toLowerCase(),
    p.weaponId.trim(),
    p.team ?? "",
    p.dualTeamOnly ? "1" : "0",
    p.rarityTier ?? "",
  ].join("|");
}

export async function getCatalogRowsCached(
  params: CatalogQueryParams,
  where: Record<string, unknown>,
): Promise<{ rows: CatalogRowRaw[]; count: number }> {
  const key = cacheKey(params);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { rows: hit.rows, count: hit.count };
  }

  const { page, limit } = params;
  const [count, rows] = await Promise.all([
    prisma.csgoSkinCatalog.count({ where }),
    prisma.csgoSkinCatalog.findMany({
      where,
      orderBy: [{ weaponName: "asc" }, { paintkitName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        category: true,
        rarity: true,
        imageUrl: true,
        weaponId: true,
        weaponName: true,
        paintkit: true,
        paintkitName: true,
      },
    }),
  ]);

  cache.set(key, { rows, count, at: Date.now() });
  return { rows, count };
}

export function invalidateCatalogRowsCache(): void {
  cache.clear();
}
