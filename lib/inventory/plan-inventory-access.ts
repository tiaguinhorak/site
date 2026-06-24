import "server-only";

import type { Plan } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { canUserAccessAllCatalogSkins } from "@/lib/inventory/catalog-access";

export type ClientPlan = "free" | "premium" | "elite";

export type InventoryPlanLimits = {
  plan: ClientPlan;
  isAdmin: boolean;
  allCatalogSkins: boolean;
  maxStickerSlots: number;
  canUseStickers: boolean;
};

const STICKER_SLOT_COUNT = 5;

function planToClient(plan: Plan): ClientPlan {
  switch (plan) {
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

export function maxStickerSlotsForPlan(plan: ClientPlan, isAdmin: boolean): number {
  if (isAdmin) return STICKER_SLOT_COUNT;
  switch (plan) {
    case "elite":
      return STICKER_SLOT_COUNT;
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

export function isStickerSlotAllowed(slotIndex: number, maxSlots: number): boolean {
  return slotIndex >= 0 && slotIndex < maxSlots;
}

export function clampStickerSlotsToPlan(slots: number[], maxSlots: number): number[] {
  const normalized = slots.slice(0, STICKER_SLOT_COUNT);
  while (normalized.length < STICKER_SLOT_COUNT) normalized.push(0);
  return normalized.map((value, index) =>
    index < maxSlots && Number.isFinite(value) ? Math.max(0, value) : 0,
  );
}

export async function getInventoryPlanLimits(userId: string): Promise<InventoryPlanLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, isAdmin: true },
  });

  const plan = planToClient(user?.plan ?? "FREE");
  const isAdmin = user?.isAdmin === true;
  const allCatalogSkins = await canUserAccessAllCatalogSkins(userId);

  return {
    plan,
    isAdmin,
    allCatalogSkins,
    maxStickerSlots: maxStickerSlotsForPlan(plan, isAdmin),
    canUseStickers: canUseStickersForPlan(plan, isAdmin),
  };
}

export const INVENTORY_STICKER_SLOT_COUNT = STICKER_SLOT_COUNT;
