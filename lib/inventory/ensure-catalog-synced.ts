import "server-only";

import { prisma } from "@/lib/prisma";
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

/** Catalog is populated by `npm run sync:skins` — runtime never hits external APIs. */
let syncInFlight: Promise<{ synced: number }> | null = null;

export async function getCatalogSkinCount(): Promise<number> {
  return prisma.csgoSkinCatalog.count();
}

/**
 * Returns cached catalog readiness from Postgres only.
 * Does NOT download CSGO-API or Steam data at runtime.
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

  const total = await getCatalogSkinCount();
  const entry = { ready: total > 0, count: total, at: now };
  setCatalogReadyMemoryCache(entry);
  await redisSetJson("catalog:ready", entry, CATALOG_READY_CACHE_MS / 1000);
  return { synced: total, alreadyPopulated: total > 0 };
}

/**
 * Best-effort readiness check. Never triggers external sync.
 */
export async function ensureCatalogReady(): Promise<void> {
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = ensureCatalogSynced()
    .then((result) => ({ synced: result.synced }))
    .finally(() => {
      syncInFlight = null;
    });

  await syncInFlight;
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
