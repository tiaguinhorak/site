import "server-only";

import { prisma } from "@/lib/prisma";
import { syncCsgoSkinCatalogWithClient } from "@/lib/inventory/sync-csgo-catalog-core";

/** Below this count the site auto-imports CSGO-API skins (weapons + gloves + knives). */
const MIN_CATALOG_SKINS = 100;

let syncInFlight: Promise<{ synced: number }> | null = null;

export async function getCatalogSkinCount(): Promise<number> {
  return prisma.csgoSkinCatalog.count();
}

/**
 * Ensures CsgoSkinCatalog is populated from CSGO-API (cached in Postgres).
 * Safe to call on inventory page load — runs once until count >= MIN_CATALOG_SKINS.
 */
export async function ensureCatalogSynced(): Promise<{ synced: number; alreadyPopulated: boolean }> {
  const count = await getCatalogSkinCount();
  if (count >= MIN_CATALOG_SKINS) {
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
