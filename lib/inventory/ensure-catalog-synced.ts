import "server-only";

import { prisma } from "@/lib/prisma";
import { syncCsgoSkinCatalogWithClient } from "@/lib/inventory/sync-csgo-catalog-core";

/** Full CSGO-API import is ~2000+; kgns !ws-only is typically ~1200–1700. */
const EXPECTED_MIN_CATALOG_SKINS = 800;
const EXPECTED_MIN_PISTOLS = 50;
const STALE_FULL_CATALOG_THRESHOLD = 2200;

let syncInFlight: Promise<{ synced: number }> | null = null;

export async function getCatalogSkinCount(): Promise<number> {
  return prisma.csgoSkinCatalog.count();
}

async function catalogNeedsRefresh(): Promise<boolean> {
  const total = await getCatalogSkinCount();
  if (total < EXPECTED_MIN_CATALOG_SKINS) return true;

  // Stale full CSGO-API import before !ws filter (not normal ws-only counts ~1641)
  if (total > STALE_FULL_CATALOG_THRESHOLD) return true;

  const pistols = await prisma.csgoSkinCatalog.count({ where: { category: "pistol" } });
  return pistols < EXPECTED_MIN_PISTOLS;
}

/**
 * Ensures CsgoSkinCatalog is populated from CSGO-API (cached in Postgres).
 * Re-runs when counts look stale (e.g. API category id change left only knives in DB).
 */
export async function ensureCatalogSynced(): Promise<{ synced: number; alreadyPopulated: boolean }> {
  if (!(await catalogNeedsRefresh())) {
    const count = await getCatalogSkinCount();
    return { synced: count, alreadyPopulated: true };
  }

  if (!syncInFlight) {
    syncInFlight = syncCsgoSkinCatalogWithClient(prisma).finally(() => {
      syncInFlight = null;
    });
  }

  const result = await syncInFlight;
  return { synced: result.synced, alreadyPopulated: false };
}
