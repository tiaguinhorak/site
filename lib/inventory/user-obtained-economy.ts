import "server-only";

import { prisma } from "@/lib/prisma";
import type { GrantedStoreReward } from "@/lib/store/types";
import { getUserSteamIdCached } from "@/lib/inventory/user-steam-id-cache";

const STICKER_SLOT_FIELDS = ["slot0", "slot1", "slot2", "slot3", "slot4"] as const;

function parseGrantedRewards(json: unknown): GrantedStoreReward[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (item): item is GrantedStoreReward =>
      item != null && typeof item === "object" && "kind" in item,
  );
}

function collectFromPurchases(
  purchases: Array<{ grantedRewards: unknown }>,
  kind: "AGENT" | "STICKER",
): Set<number> {
  const defIndexes = new Set<number>();
  for (const purchase of purchases) {
    for (const reward of parseGrantedRewards(purchase.grantedRewards)) {
      if (reward.kind !== kind) continue;
      const defIndex =
        kind === "AGENT" ? reward.agentDefIndex : reward.stickerDefIndex;
      if (defIndex != null && defIndex > 0) {
        defIndexes.add(defIndex);
      }
    }
  }
  return defIndexes;
}

async function loadCompletedPurchaseRewards(userId: string) {
  return prisma.storePurchase.findMany({
    where: { userId, status: "COMPLETED" },
    select: { grantedRewards: true },
  });
}

async function loadEconomyGrants(userId: string, kind: "AGENT" | "STICKER"): Promise<Set<number>> {
  const rows = await prisma.userEconomyGrant.findMany({
    where: { userId, kind },
    select: { defIndex: true },
  });
  return new Set(rows.map((row) => row.defIndex));
}

function mergeOwnedSets(...sets: Set<number>[]): Set<number> {
  const merged = new Set<number>();
  for (const set of sets) {
    for (const value of set) merged.add(value);
  }
  return merged;
}

export async function getUserObtainedAgentDefIndexes(
  userId: string,
): Promise<Set<number>> {
  const purchases = await loadCompletedPurchaseRewards(userId);
  const fromPurchases = collectFromPurchases(purchases, "AGENT");
  const fromGrants = await loadEconomyGrants(userId, "AGENT");

  const fromLoadout = new Set<number>();
  try {
    const steamId = await getUserSteamIdCached(userId);
    const row = await prisma.csgoPlayerAgent.findUnique({
      where: { steamId },
      select: { agentT: true, agentCT: true },
    });
    if (row?.agentT && row.agentT > 0) fromLoadout.add(row.agentT);
    if (row?.agentCT && row.agentCT > 0) fromLoadout.add(row.agentCT);
  } catch {
    // Steam not linked — purchases still count as obtained.
  }

  return mergeOwnedSets(fromPurchases, fromGrants, fromLoadout);
}

export async function getUserObtainedStickerDefIndexes(
  userId: string,
): Promise<Set<number>> {
  const purchases = await loadCompletedPurchaseRewards(userId);
  const fromPurchases = collectFromPurchases(purchases, "STICKER");
  const fromGrants = await loadEconomyGrants(userId, "STICKER");

  const fromLoadout = new Set<number>();
  try {
    const steamId = await getUserSteamIdCached(userId);
    const rows = await prisma.csgoPlayerWeaponSticker.findMany({
      where: { steamId },
      select: {
        slot0: true,
        slot1: true,
        slot2: true,
        slot3: true,
        slot4: true,
      },
    });
    for (const row of rows) {
      for (const field of STICKER_SLOT_FIELDS) {
        const value = row[field];
        if (value > 0) fromLoadout.add(value);
      }
    }
  } catch {
    // Steam not linked — purchases still count as obtained.
  }

  return mergeOwnedSets(fromPurchases, fromGrants, fromLoadout);
}
