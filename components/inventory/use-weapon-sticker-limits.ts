"use client";

import { useMemo } from "react";
import { clientWeaponIdToDefIndex } from "@/lib/inventory/weapon-defindex-client";
import {
  getWeaponStickerLimitState,
  isStickerSlotEditable,
  type WeaponStickerLimitState,
} from "@/lib/inventory/weapon-sticker-slot-limits";

export function useWeaponStickerLimits(weaponId: string, planMax: number) {
  return useMemo(() => {
    const defIndex = clientWeaponIdToDefIndex(weaponId);
    const limits = getWeaponStickerLimitState(weaponId, planMax, defIndex);
    return {
      limits,
      isSlotEditable: (slotIndex: number) => isStickerSlotEditable(slotIndex, limits),
      firstEditableSlot: findFirstEditableSlot(limits),
    };
  }, [weaponId, planMax]);
}

function findFirstEditableSlot(limits: WeaponStickerLimitState): number | null {
  for (let i = 0; i < limits.visibleSlotCount; i++) {
    if (isStickerSlotEditable(i, limits)) return i;
  }
  return null;
}
