import type { StickerFinishVariant } from "@/lib/inventory/sticker-finish-variant";
import type { StickerWeaponCompatibilityReason } from "@/lib/inventory/sticker-weapon-compatibility";

const CACHE_TTL_MS = 10 * 60 * 1000;

export type CachedStickerPickerItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  compatible?: boolean;
  incompatibleReason?: StickerWeaponCompatibilityReason | null;
  effect?: string | null;
  tournament?: string | null;
  stickerType?: string | null;
};

type CacheEntry = {
  items: CachedStickerPickerItem[];
  page: number;
  totalPages: number;
  total: number;
  at: number;
};

const memory = new Map<string, CacheEntry>();

function cacheKey(
  weaponId: string,
  page: number,
  search: string,
  finishVariant: StickerFinishVariant | "",
): string {
  return `${weaponId}:${page}:${search.trim().toLowerCase()}:${finishVariant}`;
}

export function readStickerPickerClientCache(
  weaponId: string,
  page: number,
  search: string,
  finishVariant: StickerFinishVariant | "",
): CacheEntry | null {
  const hit = memory.get(cacheKey(weaponId, page, search, finishVariant));
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    memory.delete(cacheKey(weaponId, page, search, finishVariant));
    return null;
  }
  return hit;
}

export function writeStickerPickerClientCache(
  weaponId: string,
  page: number,
  search: string,
  finishVariant: StickerFinishVariant | "",
  data: Omit<CacheEntry, "at">,
): void {
  memory.set(cacheKey(weaponId, page, search, finishVariant), {
    ...data,
    at: Date.now(),
  });
}
