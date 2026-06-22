import "server-only";

import { prisma } from "@/lib/prisma";
import { syncCsgoSkinCatalogWithClient } from "@/lib/inventory/sync-csgo-catalog-core";
import {
  CATALOG_READY_CACHE_MS,
  CATALOG_TOTAL_COUNT_CACHE_MS,
  clearCatalogMemoryCaches,
  getCatalogReadyMemoryCache,
  getCatalogTotalMemoryCache,
  setCatalogReadyMemoryCache,
  setCatalogTotalMemoryCache,
  type CatalogReadyCache,
} from "@/lib/inventory/catalog-ready-cache";
import { redisDel, redisGetJson, redisSetJson } from "@/lib/redis/cache";

export async function invalidateCatalogReadyCache(): Promise<void> {
  clearCatalogMemoryCaches();
  await redisDel("catalog:ready");
  await redisDel("catalog:total");
}

/** Catalog is static after npm run sync:skins — cache aggressively on reads. */
const EXPECTED_MIN_CATALOG_SKINS = 800;
const EXPECTED_MIN_PISTOLS = 50;
const EXPECTED_MIN_GLOVES = 40;
const STALE_FULL_CATALOG_THRESHOLD = 2200;

let syncInFlight: Promise<{ synced: number }> | null = null;

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
 * Ensures CsgoSkinCatalog is populated. After first successful check, skips DB for 24h.
 * Catalog data lives in Postgres — reads should not re-sync or re-count on every page view.
 */
export async function ensureCatalogSynced(): Promise<{ synced: number; alreadyPopulated: boolean }> {
  const now = Date.now();

  const redisCached = await redisGetJson<CatalogReadyCache>("catalog:ready");
  if (redisCached?.ready && now - redisCached.at < CATALOG_READY_CACHE_MS) {
    setCatalogReadyMemoryCache(redisCached);
    return { synced: redisCached.count, alreadyPopulated: true };
  }

  const memoryCached = getCatalogReadyMemoryCache();
  if (memoryCached?.ready && now - memoryCached.at < CATALOG_READY_CACHE_MS) {
    return { synced: memoryCached.count, alreadyPopulated: true };
  }

  const health = await catalogHealthCheck();
  if (!health.needsRefresh) {
    const entry = { ready: true, count: health.total, at: now };
    setCatalogReadyMemoryCache(entry);
    await redisSetJson("catalog:ready", entry, CATALOG_READY_CACHE_MS / 1000);
    return { synced: health.total, alreadyPopulated: true };
  }

  if (!syncInFlight) {
    syncInFlight = syncCsgoSkinCatalogWithClient(prisma).finally(() => {
      syncInFlight = null;
    });
  }

  const result = await syncInFlight;
  const entry = { ready: true, count: result.synced, at: Date.now() };
  setCatalogReadyMemoryCache(entry);
  await redisSetJson("catalog:ready", entry, CATALOG_READY_CACHE_MS / 1000);
  return { synced: result.synced, alreadyPopulated: false };
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

/** Cached unfiltered catalog size — avoids count() on every inventory request. */
export async function getCatalogTotalCached(): Promise<number> {
  const now = Date.now();
  const memoryCached = getCatalogTotalMemoryCache();
  if (memoryCached && now - memoryCached.at < CATALOG_TOTAL_COUNT_CACHE_MS) {
    return memoryCached.count;
  }

  const redisCached = await redisGetJson<{ count: number; at: number }>("catalog:total");
  if (redisCached && now - redisCached.at < CATALOG_TOTAL_COUNT_CACHE_MS) {
    setCatalogTotalMemoryCache(redisCached);
    return redisCached.count;
  }

  const count = await prisma.csgoSkinCatalog.count();
  const entry = { count, at: now };
  setCatalogTotalMemoryCache(entry);
  await redisSetJson("catalog:total", entry, CATALOG_TOTAL_COUNT_CACHE_MS / 1000);
  return count;
}
