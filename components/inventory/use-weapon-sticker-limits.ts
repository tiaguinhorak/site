"use client";

import { useMemo } from "react";
import type { InventoryCategoryKey } from "@/lib/profile";
import { getSkinStickerLimitState } from "@/lib/inventory/weapon-sticker-support";
import {
  isStickerSlotEditable,
  type WeaponStickerLimitState,
} from "@/lib/inventory/weapon-sticker-slot-limits";

export function useWeaponStickerLimits(
  weaponId: string,
  planMax: number,
  categoryKey?: InventoryCategoryKey | null,
) {
  return useMemo(() => {
    const limits = getSkinStickerLimitState(weaponId, planMax, categoryKey);
    return {
      limits,
      isSlotEditable: (slotIndex: number) => isStickerSlotEditable(slotIndex, limits),
      firstEditableSlot: findFirstEditableSlot(limits),
    };
  }, [weaponId, planMax, categoryKey]);
}

function findFirstEditableSlot(limits: WeaponStickerLimitState): number | null {
  for (let i = 0; i < limits.visibleSlotCount; i++) {
    if (isStickerSlotEditable(i, limits)) return i;
  }
  return null;
}
