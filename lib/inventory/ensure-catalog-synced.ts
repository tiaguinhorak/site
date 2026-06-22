import "server-only";

import { prisma } from "@/lib/prisma";
import { syncCsgoSkinCatalogWithClient } from "@/lib/inventory/sync-csgo-catalog-core";

/** Full CSGO-API import is ~2000+; kgns !ws-only is typically ~1200–1700. */
const EXPECTED_MIN_CATALOG_SKINS = 800;
const EXPECTED_MIN_PISTOLS = 50;
const STALE_FULL_CATALOG_THRESHOLD = 2200;
const READY_CACHE_MS = 10 * 60 * 1000;

let syncInFlight: Promise<{ synced: number }> | null = null;

type CatalogReadyCache = {
  ready: boolean;
  count: number;
  at: number;
};

let catalogReadyCache: CatalogReadyCache | null = null;

export async function getCatalogSkinCount(): Promise<number> {
  return prisma.csgoSkinCatalog.count();
}

async function catalogHealthCheck(): Promise<{ needsRefresh: boolean; total: number }> {
  const total = await prisma.csgoSkinCatalog.count();
  if (total < EXPECTED_MIN_CATALOG_SKINS) {
    return { needsRefresh: true, total };
  }
  if (total > STALE_FULL_CATALOG_THRESHOLD) {
    return { needsRefresh: true, total };
  }

  const pistols = await prisma.csgoSkinCatalog.count({ where: { category: "pistol" } });
  return { needsRefresh: pistols < EXPECTED_MIN_PISTOLS, total };
}

/**
 * Ensures CsgoSkinCatalog is populated. After first successful check, skips DB for 10 min.
 * Catalog data lives in Postgres — reads should not re-sync or re-count on every page view.
 */
export async function ensureCatalogSynced(): Promise<{ synced: number; alreadyPopulated: boolean }> {
  const now = Date.now();
  if (
    catalogReadyCache?.ready &&
    now - catalogReadyCache.at < READY_CACHE_MS
  ) {
    return { synced: catalogReadyCache.count, alreadyPopulated: true };
  }

  const health = await catalogHealthCheck();
  if (!health.needsRefresh) {
    catalogReadyCache = { ready: true, count: health.total, at: now };
    return { synced: health.total, alreadyPopulated: true };
  }

  if (!syncInFlight) {
    syncInFlight = syncCsgoSkinCatalogWithClient(prisma).finally(() => {
      syncInFlight = null;
    });
  }

  const result = await syncInFlight;
  catalogReadyCache = { ready: true, count: result.synced, at: Date.now() };
  return { synced: result.synced, alreadyPopulated: false };
}

/** Clears in-memory ready cache (e.g. after manual npm run sync:skins). */
export function invalidateCatalogReadyCache(): void {
  catalogReadyCache = null;
}
