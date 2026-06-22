/** In-memory catalog cache — safe for CLI scripts (no server-only). */

export const CATALOG_READY_CACHE_MS = 24 * 60 * 60 * 1000;
export const CATALOG_TOTAL_COUNT_CACHE_MS = 24 * 60 * 60 * 1000;

export type CatalogReadyCache = {
  ready: boolean;
  count: number;
  at: number;
};

let catalogReadyCache: CatalogReadyCache | null = null;
let totalCountCache: { count: number; at: number } | null = null;

export function getCatalogReadyMemoryCache(): CatalogReadyCache | null {
  return catalogReadyCache;
}

export function setCatalogReadyMemoryCache(value: CatalogReadyCache): void {
  catalogReadyCache = value;
}

export function getCatalogTotalMemoryCache(): { count: number; at: number } | null {
  return totalCountCache;
}

export function setCatalogTotalMemoryCache(value: { count: number; at: number }): void {
  totalCountCache = value;
}

export function clearCatalogMemoryCaches(): void {
  catalogReadyCache = null;
  totalCountCache = null;
}
