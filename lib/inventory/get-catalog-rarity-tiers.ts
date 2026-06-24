import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureCatalogReady } from "@/lib/inventory/ensure-catalog-synced";
import {
  RARITY_TIER_ORDER,
  rarityKeyFromLabel,
  type RarityKey,
} from "@/lib/inventory/rarity-tiers";

let cachedTiers: RarityKey[] | null = null;

export async function getCatalogRarityTiers(): Promise<RarityKey[]> {
  if (cachedTiers) return cachedTiers;

  await ensureCatalogReady();

  const rows = await prisma.csgoSkinCatalog.findMany({
    where: { enabled: true, gameClient: { not: "cs2" } },
    select: { rarity: true },
    distinct: ["rarity"],
  });

  const present = new Set<RarityKey>();
  for (const row of rows) {
    present.add(rarityKeyFromLabel(row.rarity));
  }

  cachedTiers = RARITY_TIER_ORDER.filter((tier) => present.has(tier));
  return cachedTiers;
}
