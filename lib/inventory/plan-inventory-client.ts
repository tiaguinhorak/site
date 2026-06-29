import type { UserProfile } from "@/lib/serializers";

export type ClientPlan = UserProfile["plan"];

export const INVENTORY_STICKER_SLOT_COUNT = 4;

export function maxStickerSlotsForPlan(plan: ClientPlan, isAdmin: boolean): number {
  if (isAdmin) return INVENTORY_STICKER_SLOT_COUNT;
  switch (plan) {
    case "elite":
      return INVENTORY_STICKER_SLOT_COUNT;
    case "premium":
      return 2;
    default:
      return 0;
  }
}

export function canUseStickersForPlan(plan: ClientPlan, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return plan === "premium" || plan === "elite";
}

export function canUseAgentsForPlan(plan: ClientPlan, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return plan === "premium" || plan === "elite";
}

export function isStickerSlotLocked(slotIndex: number, maxSlots: number): boolean {
  return slotIndex >= maxSlots;
}
