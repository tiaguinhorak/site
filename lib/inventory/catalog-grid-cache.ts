import type { InventoryCategoryKey } from "@/lib/profile";
import type { RarityKey } from "@/lib/inventory/rarity-tiers";

export type CachedCatalogSkin = {
  id: string;
  name: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  imageUrl?: string | null;
  weaponId: string;
  weaponName?: string;
  paintkit: number;
  paintkitName: string;
  equipped: boolean;
  equippedT: boolean;
  equippedCT: boolean;
  owned: boolean;
};

export type CatalogGridCacheParams = {
  category: string;
  page: number;
  search: string;
  weaponId: string;
  dualTeamOnly: boolean;
  rarityTier: string;
};

export type CatalogGridCacheEntry = {
  items: CachedCatalogSkin[];
  page: number;
  totalPages: number;
  resultTotal: number;
  catalogTotal: number;
  weaponOptions: Array<{ weaponId: string; weaponName: string }>;
  availableRarityTiers: RarityKey[];
  at: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const STORAGE_KEY = "cc:catalog-grid:v1";
const MAX_STORAGE_ENTRIES = 24;

const memory = new Map<string, CatalogGridCacheEntry>();

function cacheKey(params: CatalogGridCacheParams): string {
  return [
    params.category,
    params.page,
    params.search.trim().toLowerCase(),
    params.weaponId,
    params.dualTeamOnly ? "1" : "0",
    params.rarityTier,
  ].join("|");
}

function isFresh(entry: CatalogGridCacheEntry): boolean {
  return Date.now() - entry.at < CACHE_TTL_MS;
}

type StoragePayload = Record<string, CatalogGridCacheEntry>;

function readStorage(): StoragePayload {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoragePayload;
  } catch {
    return {};
  }
}

function writeStorage(payload: StoragePayload): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(payload)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, MAX_STORAGE_ENTRIES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // quota exceeded — ignore
  }
}

export function readCatalogGridCache(
  params: CatalogGridCacheParams,
): CatalogGridCacheEntry | null {
  const key = cacheKey(params);
  const mem = memory.get(key);
  if (mem && isFresh(mem)) return mem;

  const stored = readStorage()[key];
  if (stored && isFresh(stored)) {
    memory.set(key, stored);
    return stored;
  }
  return null;
}

export function writeCatalogGridCache(
  params: CatalogGridCacheParams,
  data: Omit<CatalogGridCacheEntry, "at">,
): void {
  const key = cacheKey(params);
  const entry: CatalogGridCacheEntry = { ...data, at: Date.now() };
  memory.set(key, entry);

  const storage = readStorage();
  storage[key] = entry;
  writeStorage(storage);
}

/**
 * Update the equipped/unequipped state of a specific skin across all cached pages.
 * Call this after optimistic equip/unequip so the cache stays consistent.
 */
export function patchCatalogGridCacheEquipState(
  skinId: string,
  weaponId: string,
  equippedT: boolean,
  equippedCT: boolean,
): void {
  // Patch in-memory entries
  for (const [key, entry] of memory.entries()) {
    const needsPatch = entry.items.some((item) => item.id === skinId || item.weaponId === weaponId);
    if (!needsPatch) continue;
    const patched: CatalogGridCacheEntry = {
      ...entry,
      items: entry.items.map((item) => {
        if (item.id === skinId) {
          return { ...item, equippedT, equippedCT, equipped: equippedT || equippedCT };
        }
        // If this weapon already has another skin equipped on the same team(s), unequip it
        if (item.weaponId === weaponId && item.id !== skinId) {
          const newT = equippedT ? false : item.equippedT;
          const newCT = equippedCT ? false : item.equippedCT;
          return { ...item, equippedT: newT, equippedCT: newCT, equipped: newT || newCT };
        }
        return item;
      }),
    };
    memory.set(key, patched);
  }

  // Patch sessionStorage entries too
  if (typeof window === "undefined") return;
  try {
    const storage = readStorage();
    let dirty = false;
    for (const [key, entry] of Object.entries(storage)) {
      const needsPatch = entry.items.some((item) => item.id === skinId || item.weaponId === weaponId);
      if (!needsPatch) continue;
      storage[key] = {
        ...entry,
        items: entry.items.map((item) => {
          if (item.id === skinId) {
            return { ...item, equippedT, equippedCT, equipped: equippedT || equippedCT };
          }
          if (item.weaponId === weaponId && item.id !== skinId) {
            const newT = equippedT ? false : item.equippedT;
            const newCT = equippedCT ? false : item.equippedCT;
            return { ...item, equippedT: newT, equippedCT: newCT, equipped: newT || newCT };
          }
          return item;
        }),
      };
      dirty = true;
    }
    if (dirty) writeStorage(storage);
  } catch {
    // sessionStorage write failure — ignore
  }
}

/** Clear all catalog grid caches (memory + sessionStorage). */
export function clearAllCatalogGridCache(): void {
  memory.clear();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function prefetchCatalogGrid(params: CatalogGridCacheParams): void {
  if (readCatalogGridCache(params)) return;

  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: "36",
    category: params.category,
    search: params.search,
  });
  if (params.weaponId) searchParams.set("weaponId", params.weaponId);
  if (params.dualTeamOnly) searchParams.set("dualTeamOnly", "1");
  if (params.rarityTier !== "all") searchParams.set("rarityTier", params.rarityTier);

  void fetch(`/api/inventory/skins?${searchParams}`, { credentials: "same-origin" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data?.items) return;
      writeCatalogGridCache(params, {
        items: data.items,
        page: data.page ?? params.page,
        totalPages: data.totalPages ?? 1,
        resultTotal: data.total ?? 0,
        catalogTotal: data.catalogTotal ?? 0,
        weaponOptions: data.weaponOptions ?? [],
        availableRarityTiers: data.availableRarityTiers ?? [],
      });
    })
    .catch(() => undefined);
}
