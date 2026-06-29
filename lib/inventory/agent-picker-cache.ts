export type CachedAgentPickerItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: string;
};

type CacheEntry = {
  items: CachedAgentPickerItem[];
  totalPages: number;
  at: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(team: string, page: number, search: string): string {
  return `${team}:${page}:${search.trim().toLowerCase()}`;
}

export function readAgentPickerCache(
  team: string,
  page: number,
  search: string,
): CacheEntry | null {
  const key = cacheKey(team, page, search);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function writeAgentPickerCache(
  team: string,
  page: number,
  search: string,
  items: CachedAgentPickerItem[],
  totalPages: number,
): void {
  cache.set(cacheKey(team, page, search), {
    items,
    totalPages,
    at: Date.now(),
  });
}
