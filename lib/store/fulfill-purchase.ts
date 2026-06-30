import "server-only";

import { CsgoApiError } from "@/lib/csgo-api/http";
import type { StoreItem, StoreItemReward } from "@/lib/generated/prisma/client";
import {
  grantStoreRewardRow,
  userOwnsCatalogSkin,
} from "@/lib/store/grant-reward";
import {
  pickWeightedStoreReward,
  pickWeightedStoreRewardExcluding,
} from "@/lib/store/case-roll";
import { notifyStorePurchaseCompleted } from "@/lib/store/store-notifications";
import type { GrantedStoreReward, StorePurchaseResult } from "@/lib/store/types";
import { prisma } from "@/lib/prisma";
import { creditCoins, debitCoins, InsufficientCoinsError } from "@/lib/economy/wallet";
import { notifyDiscordPlanSyncForUser } from "@/lib/discord/sync-user";

export type StorePurchaseCurrency = "brl" | "coins";

type StoreItemWithRewards = StoreItem & { rewards: StoreItemReward[] };

async function countCompletedPurchases(userId: string, storeItemId: string): Promise<number> {
  return prisma.storePurchase.count({
    where: { userId, storeItemId, status: "COMPLETED" },
  });
}

export async function validatePurchaseEligibility(
  userId: string,
  item: StoreItemWithRewards,
): Promise<void> {
  if (!item.enabled) {
    throw new CsgoApiError("Este item não está disponível na loja.", 400);
  }
  const hasSpecialConfig =
    (item.productKind === "TAG" && Boolean(item.tagText?.trim())) ||
    (item.productKind === "MEDAL" && Boolean(item.medalCode?.trim())) ||
    (item.productKind === "SUBSCRIPTION" && item.grantPlan != null && item.grantPlan !== "FREE");
  if (item.rewards.length === 0 && !hasSpecialConfig) {
    throw new CsgoApiError("Item da loja sem recompensas configuradas.", 400);
  }

  if (item.maxPerUser != null) {
    const count = await countCompletedPurchases(userId, item.id);
    if (count >= item.maxPerUser) {
      throw new CsgoApiError("Você atingiu o limite de compras deste item.", 409);
    }
  }

  if (item.productKind === "SKIN") {
    const skinRewards = item.rewards.filter(
      (row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId,
    );
    if (skinRewards.length === 1 && skinRewards[0]?.catalogSkinId) {
      if (await userOwnsCatalogSkin(userId, skinRewards[0].catalogSkinId)) {
        throw new CsgoApiError("Você já possui esta skin.", 409);
      }
    }
  }
}

async function resolveCaseReward(
  userId: string,
  rewards: StoreItemReward[],
): Promise<StoreItemReward> {
  if (rewards.length === 0) {
    throw new CsgoApiError("Caixa sem recompensas.", 400);
  }

  const ownedRewardIds = new Set<string>();
  for (const reward of rewards) {
    if (
      reward.kind === "CATALOG_SKIN" &&
      reward.catalogSkinId &&
      (await userOwnsCatalogSkin(userId, reward.catalogSkinId))
    ) {
      ownedRewardIds.add(reward.id);
    }
  }

  const picked =
    ownedRewardIds.size >= rewards.length
      ? pickWeightedStoreReward(rewards)
      : pickWeightedStoreRewardExcluding(rewards, ownedRewardIds);

  if (!picked) {
    throw new CsgoApiError("Não foi possível sortear a caixa.", 500);
  }
  return picked;
}

async function grantAllRewards(
  userId: string,
  rewards: StoreItemReward[],
  options?: { respectQuantity?: boolean },
): Promise<GrantedStoreReward[]> {
  const granted: GrantedStoreReward[] = [];
  const sorted = [...rewards].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const reward of sorted) {
    const times = options?.respectQuantity ? Math.max(1, reward.quantity) : 1;
    for (let i = 0; i < times; i += 1) {
      granted.push(await grantStoreRewardRow(userId, reward, { notifySkin: false }));
    }
  }

  return granted;
}

async function fulfillTagPurchase(
  userId: string,
  item: StoreItemWithRewards,
): Promise<GrantedStoreReward[]> {
  const tag = item.tagText?.trim();
  if (!tag) {
    throw new CsgoApiError("Tag não configurada para este item.", 400);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { profileTag: tag.slice(0, 16) },
  });
  return [{ kind: "STICKER", name: `Tag [${tag}]` }];
}

async function fulfillMedalPurchase(
  userId: string,
  item: StoreItemWithRewards,
): Promise<GrantedStoreReward[]> {
  const code = item.medalCode?.trim();
  if (!code) {
    throw new CsgoApiError("Medalha não configurada para este item.", 400);
  }

  const achievement = await prisma.achievementDefinition.findUnique({
    where: { code },
    select: { id: true, title: true, enabled: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { profileMedalCode: code },
  });

  if (achievement?.enabled) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: { userId, achievementId: achievement.id },
      },
      create: { userId, achievementId: achievement.id },
      update: {},
    });
  }

  return [{ kind: "STICKER", name: achievement?.title ?? `Medalha ${code}` }];
}

async function fulfillSubscriptionPurchase(
  userId: string,
  item: StoreItemWithRewards,
): Promise<GrantedStoreReward[]> {
  if (!item.grantPlan || item.grantPlan === "FREE") {
    throw new CsgoApiError("Plano de assinatura não configurado.", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan: item.grantPlan },
  });

  void notifyDiscordPlanSyncForUser(userId);

  const label = item.grantPlan === "ELITE" ? "Elite" : "Premium";
  return [{ kind: "STICKER", name: `Assinatura ${label}` }];
}

async function fulfillRewardsForItem(
  userId: string,
  item: StoreItemWithRewards,
): Promise<GrantedStoreReward[]> {
  switch (item.productKind) {
    case "CASE": {
      const picked = await resolveCaseReward(userId, item.rewards);
      return [await grantStoreRewardRow(userId, picked, { notifySkin: false })];
    }
    case "PACKAGE":
      return grantAllRewards(userId, item.rewards, { respectQuantity: true });
    case "SKIN":
    case "AGENT":
      return grantAllRewards(userId, item.rewards);
    case "TAG":
      return fulfillTagPurchase(userId, item);
    case "MEDAL":
      return fulfillMedalPurchase(userId, item);
    case "SUBSCRIPTION":
      return fulfillSubscriptionPurchase(userId, item);
    default: {
      const _exhaustive: never = item.productKind;
      throw new CsgoApiError(`Tipo de produto não suportado: ${_exhaustive}`, 400);
    }
  }
}

export async function purchaseStoreItem(
  userId: string,
  storeItemId: string,
  options?: {
    skipNotification?: boolean;
    currency?: StorePurchaseCurrency;
    recipientUserId?: string;
  },
): Promise<StorePurchaseResult> {
  const currency: StorePurchaseCurrency = options?.currency ?? "brl";
  // When gifting, the payer is `userId` but rewards/eligibility target the recipient.
  const beneficiaryId = options?.recipientUserId ?? userId;
  const item = await prisma.storeItem.findUnique({
    where: { id: storeItemId },
    include: {
      rewards: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!item) {
    throw new CsgoApiError("Item não encontrado.", 404);
  }

  await validatePurchaseEligibility(beneficiaryId, item);

  if (currency === "coins" && (item.coinPrice == null || item.coinPrice <= 0)) {
    throw new CsgoApiError("Este item não pode ser comprado com moedas.", 400);
  }

  // Charge coins up front (atomic). Refund if fulfillment fails.
  let coinsCharged = 0;
  if (currency === "coins") {
    try {
      const result = await debitCoins(prisma, {
        userId,
        amount: item.coinPrice!,
        kind: "PURCHASE",
        reason: `Compra: ${item.name}`,
        metadata: { storeItemId: item.id, productKind: item.productKind },
      });
      coinsCharged = -result.amount;
    } catch (err) {
      if (err instanceof InsufficientCoinsError) {
        throw new CsgoApiError("Você não tem moedas suficientes para esta compra.", 402);
      }
      throw err;
    }
  }

  let granted: GrantedStoreReward[];
  try {
    granted = await fulfillRewardsForItem(beneficiaryId, item);
  } catch (err) {
    if (coinsCharged > 0) {
      await creditCoins(prisma, {
        userId,
        amount: coinsCharged,
        kind: "REFUND",
        reason: `Estorno: ${item.name}`,
        metadata: { storeItemId: item.id },
      });
    }
    throw err;
  }

  const purchase = await prisma.storePurchase.create({
    data: {
      userId,
      storeItemId: item.id,
      priceCents: currency === "coins" ? 0 : item.priceCents,
      status: "COMPLETED",
      grantedRewards: granted,
    },
  });

  if (!options?.skipNotification) {
    // Deliver the purchase notification to whoever received the rewards.
    await notifyStorePurchaseCompleted(beneficiaryId, item.name, item.productKind, granted);
  }

  return {
    purchaseId: purchase.id,
    storeItemId: item.id,
    storeItemName: item.name,
    productKind: item.productKind,
    granted,
  };
}

export async function getUserStorePurchaseCounts(
  userId: string,
  storeItemIds: string[],
): Promise<Map<string, number>> {
  if (storeItemIds.length === 0) return new Map();

  const rows = await prisma.storePurchase.groupBy({
    by: ["storeItemId"],
    where: {
      userId,
      storeItemId: { in: storeItemIds },
      status: "COMPLETED",
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.storeItemId, row._count._all]));
}
