import "server-only";

import type { Prisma, StoreItem, StoreItemReward } from "@/lib/generated/prisma/client";
import { formatPriceCents } from "@/lib/serializers";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import type { StoreRewardPreview } from "@/lib/store/types";
import type { AgentPreviewMeta } from "@/lib/store/agent-preview-map";
import type { StickerPreviewMeta } from "@/lib/store/sticker-preview-map";

type StoreItemRow = StoreItem & {
  rewards?: (StoreItemReward & {
    catalogSkin?: {
      weaponName: string;
      paintkitName: string;
      imageUrl: string | null;
      category?: string;
      rarity?: string;
    } | null;
  })[];
};

export function rewardPreviewLabel(
  reward: StoreItemRow["rewards"] extends (infer R)[] | undefined ? R : never,
): { label: string | null; imageUrl: string | null } {
  if (!reward) return { label: null, imageUrl: null };

  if (reward.kind === "CATALOG_SKIN" && reward.catalogSkin) {
    return {
      label: `${reward.catalogSkin.weaponName} | ${reward.catalogSkin.paintkitName}`,
      imageUrl:
        reward.catalogSkin.imageUrl ??
        (reward.catalogSkinId ? catalogSkinImageUrl(reward.catalogSkinId) : null),
    };
  }

  if (reward.kind === "AGENT" && reward.agentDefIndex) {
    return {
      label: `Agente #${reward.agentDefIndex}`,
      imageUrl: null,
    };
  }

  if (reward.kind === "STICKER" && reward.stickerDefIndex) {
    return {
      label: `Sticker #${reward.stickerDefIndex}`,
      imageUrl: null,
    };
  }

  return { label: null, imageUrl: null };
}

export function serializeStoreReward(
  reward: NonNullable<StoreItemRow["rewards"]>[number],
  context?: {
    agentByDef?: Map<number, AgentPreviewMeta>;
    stickerByDef?: Map<number, StickerPreviewMeta>;
  },
): StoreRewardPreview {
  const { label, imageUrl } = rewardPreviewLabel(reward);

  if (reward.kind === "AGENT" && reward.agentDefIndex) {
    const agent = context?.agentByDef?.get(reward.agentDefIndex);
    return {
      id: reward.id,
      kind: reward.kind,
      catalogSkinId: reward.catalogSkinId,
      agentDefIndex: reward.agentDefIndex,
      stickerDefIndex: reward.stickerDefIndex,
      weight: reward.weight,
      quantity: reward.quantity,
      sortOrder: reward.sortOrder,
      label: agent?.name ?? label,
      imageUrl: agent?.imageUrl ?? imageUrl,
      subLabel: agent?.team ?? null,
    };
  }

  if (reward.kind === "STICKER" && reward.stickerDefIndex) {
    const sticker = context?.stickerByDef?.get(reward.stickerDefIndex);
    return {
      id: reward.id,
      kind: reward.kind,
      catalogSkinId: reward.catalogSkinId,
      agentDefIndex: reward.agentDefIndex,
      stickerDefIndex: reward.stickerDefIndex,
      weight: reward.weight,
      quantity: reward.quantity,
      sortOrder: reward.sortOrder,
      label: sticker?.name ?? label,
      imageUrl: sticker?.imageUrl ?? imageUrl,
      subLabel: "Sticker",
    };
  }

  const subLabel =
    reward.kind === "CATALOG_SKIN" && reward.catalogSkin?.rarity
      ? reward.catalogSkin.rarity
      : null;

  return {
    id: reward.id,
    kind: reward.kind,
    catalogSkinId: reward.catalogSkinId,
    agentDefIndex: reward.agentDefIndex,
    stickerDefIndex: reward.stickerDefIndex,
    weight: reward.weight,
    quantity: reward.quantity,
    sortOrder: reward.sortOrder,
    label,
    imageUrl,
    subLabel,
  };
}

export type PublicStoreItem = {
  id: string;
  name: string;
  type: string;
  productKind: StoreItem["productKind"];
  price: string;
  priceCents: number;
  originalPrice?: string;
  coinPrice: number | null;
  badge: string;
  description: string;
  accent: string;
  imageUrl: string | null;
  trending: boolean;
  featured: boolean;
  maxPerUser: number | null;
  purchaseCount: number;
  canPurchase: boolean;
  canBuyWithCoins: boolean;
  ownedSkin: boolean;
  inCart: boolean;
  rewardsPreview: StoreRewardPreview[];
};

export function serializePublicStoreItem(
  item: StoreItemRow,
  context: {
    purchaseCount: number;
    ownedSkinIds: Set<string>;
    agentByDef?: Map<number, AgentPreviewMeta>;
    stickerByDef?: Map<number, StickerPreviewMeta>;
    cartStoreItemIds?: Set<string>;
  },
): PublicStoreItem {
  const rewards = item.rewards ?? [];
  const skinReward = rewards.find((row) => row.kind === "CATALOG_SKIN" && row.catalogSkinId);
  const skinOnlyReward =
    item.productKind === "SKIN" &&
    rewards.length === 1 &&
    rewards[0]?.kind === "CATALOG_SKIN";
  const ownedSkin =
    skinOnlyReward && skinReward?.catalogSkinId
      ? context.ownedSkinIds.has(skinReward.catalogSkinId)
      : false;

  const atLimit =
    item.maxPerUser != null && context.purchaseCount >= item.maxPerUser;
  const inCart = context.cartStoreItemIds?.has(item.id) ?? false;
  const canPurchase =
    item.enabled &&
    rewards.length > 0 &&
    !atLimit &&
    !inCart &&
    !(item.productKind === "SKIN" && ownedSkin);
  const canBuyWithCoins =
    item.coinPrice != null &&
    item.coinPrice > 0 &&
    item.enabled &&
    rewards.length > 0 &&
    !atLimit &&
    !(item.productKind === "SKIN" && ownedSkin);

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    productKind: item.productKind,
    price: formatPriceCents(item.priceCents),
    priceCents: item.priceCents,
    originalPrice: item.originalCents ? formatPriceCents(item.originalCents) : undefined,
    coinPrice: item.coinPrice ?? null,
    badge: item.badge,
    description: item.description,
    accent: item.accent,
    imageUrl: item.imageUrl ?? null,
    trending: item.trending,
    featured: item.featured,
    maxPerUser: item.maxPerUser,
    purchaseCount: context.purchaseCount,
    canPurchase,
    canBuyWithCoins,
    ownedSkin,
    inCart,
    rewardsPreview: rewards.map((row) => serializeStoreReward(row, context)),
  };
}

export const storeItemWithRewardsInclude = {
  rewards: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      catalogSkin: {
        select: {
          weaponId: true,
          paintkit: true,
          weaponName: true,
          paintkitName: true,
          imageUrl: true,
          category: true,
          rarity: true,
        },
      },
    },
  },
} satisfies Prisma.StoreItemInclude;
