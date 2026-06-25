/**
 * CS:GO Legacy sticker slot limits per weapon (matches PTaH GetNumSupportedStickerSlots).
 * Site Elite = all slots the weapon supports (usually 4). Premium = 2.
 */

export const CSGO_WEAPON_STICKER_SLOTS_DEFAULT = 4;
/** DB / API array size (slot0–slot4); CS:GO uses up to 4 on most weapons. */
export const STICKER_SLOT_STORAGE_COUNT = 5;

/** Item defindexes with zero sticker slots (knives / melee). */
const ZERO_STICKER_DEFINDEXES = new Set<number>([
  42, // generic knife fallback
]);

/** Per-defindex overrides when not the default 4 (CS:GO Legacy). */
const STICKER_SLOTS_BY_DEFINDEX: Record<number, number> = {
  1: 4,
  2: 4,
  3: 4,
  4: 4,
  7: 4,
  8: 4,
  9: 4,
  10: 4,
  11: 4,
  13: 4,
  14: 4,
  16: 4,
  17: 4,
  19: 4,
  23: 4,
  24: 4,
  25: 4,
  26: 4,
  27: 4,
  28: 4,
  29: 4,
  30: 4,
  32: 4,
  33: 4,
  34: 4,
  35: 4,
  36: 4,
  38: 4,
  39: 4,
  40: 4,
  60: 4,
  61: 4,
  63: 4,
  64: 4,
};

function isKnifeWeaponId(weaponId: string): boolean {
  const id = weaponId.trim().toLowerCase();
  return id.includes("knife") || id.includes("bayonet");
}

export function weaponSupportsStickersById(weaponId: string): boolean {
  const id = weaponId.trim().toLowerCase();
  if (id.includes("glove")) return false;
  if (isKnifeWeaponId(id)) return false;
  return maxStickerSlotsForWeaponDefIndex(null, id) > 0;
}

export function maxStickerSlotsForWeaponDefIndex(
  defIndex: number | null | undefined,
  weaponId?: string,
): number {
  if (weaponId && isKnifeWeaponId(weaponId)) return 0;

  if (defIndex != null && defIndex > 0) {
    if (ZERO_STICKER_DEFINDEXES.has(defIndex)) return 0;
    const mapped = STICKER_SLOTS_BY_DEFINDEX[defIndex];
    if (mapped !== undefined) return mapped;
    return CSGO_WEAPON_STICKER_SLOTS_DEFAULT;
  }

  if (weaponId && isKnifeWeaponId(weaponId)) return 0;
  if (weaponId?.trim()) return CSGO_WEAPON_STICKER_SLOTS_DEFAULT;
  return 0;
}

export function maxStickerSlotsForWeaponId(weaponId: string): number {
  return maxStickerSlotsForWeaponDefIndex(null, weaponId);
}

export function effectiveMaxStickerSlots(
  weaponId: string,
  planMax: number,
  defIndex?: number | null,
): number {
  const weaponMax = maxStickerSlotsForWeaponDefIndex(defIndex ?? null, weaponId);
  if (weaponMax <= 0 || planMax <= 0) return 0;
  return Math.min(planMax, weaponMax);
}

export function clampStickerSlotsToWeapon(
  slots: number[],
  weaponId: string,
  planMax: number,
  defIndex?: number | null,
): number[] {
  const effectiveMax = effectiveMaxStickerSlots(weaponId, planMax, defIndex);
  const normalized = slots.slice(0, STICKER_SLOT_STORAGE_COUNT).map((n) =>
    Number.isFinite(n) ? Math.max(0, n) : 0,
  );
  while (normalized.length < STICKER_SLOT_STORAGE_COUNT) normalized.push(0);

  return normalized.map((value, index) =>
    index < effectiveMax && Number.isFinite(value) ? Math.max(0, value) : 0,
  );
}

export function uiStickerSlotCount(weaponId: string): number {
  const max = maxStickerSlotsForWeaponId(weaponId);
  return max > 0 ? max : 0;
}
