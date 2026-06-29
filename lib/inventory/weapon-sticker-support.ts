import type { InventoryCategoryKey } from "@/lib/profile";
import {
  getWeaponStickerLimitState,
  type WeaponStickerLimitState,
} from "@/lib/inventory/weapon-sticker-slot-limits";
import { clientWeaponIdToDefIndex } from "@/lib/inventory/weapon-defindex-client";

/** CS:GO Legacy: knives and gloves never accept weapon stickers. */
const NON_STICKER_CATEGORIES = new Set<InventoryCategoryKey>(["knife", "gloves"]);

export function isNonStickerInventoryCategory(
  category?: InventoryCategoryKey | string | null,
): boolean {
  if (!category) return false;
  return NON_STICKER_CATEGORIES.has(category as InventoryCategoryKey);
}

export function getSkinStickerLimitState(
  weaponId: string,
  planMax: number,
  category?: InventoryCategoryKey | string | null,
): WeaponStickerLimitState {
  if (isNonStickerInventoryCategory(category)) {
    return {
      supportsStickers: false,
      weaponMaxSlots: 0,
      effectiveMaxSlots: 0,
      visibleSlotCount: 0,
    };
  }

  return getWeaponStickerLimitState(
    weaponId,
    planMax,
    clientWeaponIdToDefIndex(weaponId),
  );
}

export function skinSupportsStickers(
  weaponId: string,
  planMax: number,
  category?: InventoryCategoryKey | string | null,
): boolean {
  return getSkinStickerLimitState(weaponId, planMax, category).supportsStickers;
}
