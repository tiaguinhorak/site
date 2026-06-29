import "server-only";

import {
  getPlayerWeaponStickers,
  type WeaponStickerSlotsEnriched,
} from "@/lib/inventory/player-weapon-stickers";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

const CACHE_TTL_MS = 60 * 1000; // 1 minute

type Entry = { data: WeaponStickerSlotsEnriched; at: number };
const cache = new Map<string, Entry>();

function key(steamId: string, weaponId: string, team: LoadoutTeam): string {
  return `${steamId}:${weaponId}:${team}`;
}

export async function getPlayerWeaponStickersCached(
  steamId: string,
  weaponId: string,
  team: LoadoutTeam,
  options?: { planMax?: number },
): Promise<WeaponStickerSlotsEnriched> {
  const k = key(steamId, weaponId, team);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const data = await getPlayerWeaponStickers(steamId, weaponId, team, options);
  cache.set(k, { data, at: Date.now() });
  return data;
}

export function invalidatePlayerWeaponStickersCache(
  steamId: string,
  weaponId?: string,
  team?: LoadoutTeam,
): void {
  if (weaponId && team) {
    cache.delete(key(steamId, weaponId, team));
  } else {
    for (const k of cache.keys()) {
      if (k.startsWith(`${steamId}:`)) cache.delete(k);
    }
  }
}
