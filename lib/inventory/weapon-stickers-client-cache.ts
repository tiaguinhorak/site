import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

const CACHE_TTL_MS = 5 * 60 * 1000;

export type CachedWeaponStickers = {
  slots: number[];
  slotLabels: string[];
  slotImageUrls: string[];
  at: number;
};

const memory = new Map<string, CachedWeaponStickers>();

function key(weaponId: string, team: LoadoutTeam): string {
  return `${weaponId}:${team}`;
}

export function readWeaponStickersClientCache(
  weaponId: string,
  team: LoadoutTeam,
): CachedWeaponStickers | null {
  const hit = memory.get(key(weaponId, team));
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    memory.delete(key(weaponId, team));
    return null;
  }
  return hit;
}

export function writeWeaponStickersClientCache(
  weaponId: string,
  team: LoadoutTeam,
  data: Omit<CachedWeaponStickers, "at">,
): void {
  memory.set(key(weaponId, team), { ...data, at: Date.now() });
}

export function invalidateWeaponStickersClientCache(
  weaponId?: string,
  team?: LoadoutTeam,
): void {
  if (weaponId && team) {
    memory.delete(key(weaponId, team));
    return;
  }
  if (weaponId) {
    for (const k of memory.keys()) {
      if (k.startsWith(`${weaponId}:`)) memory.delete(k);
    }
    return;
  }
  memory.clear();
}
