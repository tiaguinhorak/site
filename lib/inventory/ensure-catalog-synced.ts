import "server-only";

import { prisma } from "@/lib/prisma";
import { redisGetJson, redisSetJson, redisDel } from "@/lib/redis/cache";
import { syncCsgoSkinCatalogWithClient } from "@/lib/inventory/sync-csgo-catalog-core";

/** Full CSGO-API import is ~2000+; kgns !ws-only is typically ~1200–1700. */
const EXPECTED_MIN_CATALOG_SKINS = 800;
const EXPECTED_MIN_PISTOLS = 50;
const EXPECTED_MIN_GLOVES = 40;
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
  const gloves = await prisma.csgoSkinCatalog.count({ where: { category: "gloves" } });
  return {
    needsRefresh: pistols < EXPECTED_MIN_PISTOLS || gloves < EXPECTED_MIN_GLOVES,
    total,
  };
}

/**
 * Ensures CsgoSkinCatalog is populated. After first successful check, skips DB for 10 min.
 * Catalog data lives in Postgres — reads should not re-sync or re-count on every page view.
 */
export async function ensureCatalogSynced(): Promise<{ synced: number; alreadyPopulated: boolean }> {
  const now = Date.now();

  const redisCached = await redisGetJson<CatalogReadyCache>("catalog:ready");
  if (redisCached?.ready && now - redisCached.at < READY_CACHE_MS) {
    catalogReadyCache = redisCached;
    return { synced: redisCached.count, alreadyPopulated: true };
  }

  if (
    catalogReadyCache?.ready &&
    now - catalogReadyCache.at < READY_CACHE_MS
  ) {
    return { synced: catalogReadyCache.count, alreadyPopulated: true };
  }

  const health = await catalogHealthCheck();
  if (!health.needsRefresh) {
    catalogReadyCache = { ready: true, count: health.total, at: now };
    await redisSetJson("catalog:ready", catalogReadyCache, READY_CACHE_MS / 1000);
    return { synced: health.total, alreadyPopulated: true };
  }

  if (!syncInFlight) {
    syncInFlight = syncCsgoSkinCatalogWithClient(prisma).finally(() => {
      syncInFlight = null;
    });
  }

  const result = await syncInFlight;
  catalogReadyCache = { ready: true, count: result.synced, at: Date.now() };
  await redisSetJson("catalog:ready", catalogReadyCache, READY_CACHE_MS / 1000);
  return { synced: result.synced, alreadyPopulated: false };
}

/** Clears in-memory ready cache (e.g. after manual npm run sync:skins). */
export async function invalidateCatalogReadyCache(): Promise<void> {
  catalogReadyCache = null;
  totalCountCache = null;
  await redisDel("catalog:ready");
}

/**
 * Best-effort populate. Never throws — a slow/failed sync must not break catalog reads.
 * Only triggers a full sync when the catalog is actually empty.
 */
export async function ensureCatalogReady(): Promise<void> {
  try {
    const total = await getCatalogTotalCached();
    if (total > 0) return;
    await ensureCatalogSynced();
  } catch (err) {
    console.warn("[catalog] ensureCatalogReady non-fatal:", err);
  }
}

let totalCountCache: { count: number; at: number } | null = null;
const TOTAL_COUNT_CACHE_MS = 60 * 1000;

/** Cached unfiltered catalog size — avoids a count() on every inventory request. */
export async function getCatalogTotalCached(): Promise<number> {
  const now = Date.now();
  if (totalCountCache && now - totalCountCache.at < TOTAL_COUNT_CACHE_MS) {
    return totalCountCache.count;
  }
  const count = await prisma.csgoSkinCatalog.count();
  totalCountCache = { count, at: now };
  return count;
}
