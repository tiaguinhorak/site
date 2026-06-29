export type CachedSkinPickerItem = {
  catalogSkinId: string;
  name: string;
  imageUrl: string | null;
  accent: string;
  rarity: string;
  owned: boolean;
  equippedT: boolean;
  equippedCT: boolean;
};

type CacheEntry = {
  items: CachedSkinPickerItem[];
  totalPages: number;
  at: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(weaponId: string, page: number, search: string): string {
  return `${weaponId}:${page}:${search.trim().toLowerCase()}`;
}

export function readSkinPickerCache(
  weaponId: string,
  page: number,
  search: string,
): CacheEntry | null {
  const entry = cache.get(cacheKey(weaponId, page, search));
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(weaponId, page, search));
    return null;
  }
  return entry;
}

export function writeSkinPickerCache(
  weaponId: string,
  page: number,
  search: string,
  items: CachedSkinPickerItem[],
  totalPages: number,
): void {
  cache.set(cacheKey(weaponId, page, search), {
    items,
    totalPages,
    at: Date.now(),
  });
}

export function prefetchSkinPickerPage(
  weaponId: string,
  page = 1,
  search = "",
  limit = 12,
): void {
  const cached = readSkinPickerCache(weaponId, page, search);
  if (cached) return;

  const params = new URLSearchParams({
    weaponId,
    limit: String(limit),
    page: String(page),
    category: "all",
  });
  const query = search.trim();
  if (query) params.set("search", query);

  void fetch(`/api/inventory/skins?${params}`, { credentials: "same-origin" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data?.items) return;
      writeSkinPickerCache(
        weaponId,
        page,
        search,
        data.items.map(
          (item: {
            id: string;
            name: string;
            imageUrl?: string | null;
            accent: string;
            rarity: string;
            owned: boolean;
            equippedT: boolean;
            equippedCT: boolean;
          }) => ({
            catalogSkinId: item.id,
            name: item.name,
            imageUrl: item.imageUrl ?? null,
            accent: item.accent,
            rarity: item.rarity,
            owned: item.owned,
            equippedT: item.equippedT,
            equippedCT: item.equippedCT,
          }),
        ),
        data.totalPages ?? 1,
      );
    })
    .catch(() => undefined);
}
