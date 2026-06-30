import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  collectAgentDefIndexesFromStoreItems,
  loadAgentPreviewMap,
} from "@/lib/store/agent-preview-map";
import {
  collectStickerDefIndexesFromStoreItems,
  loadStickerPreviewMap,
} from "@/lib/store/sticker-preview-map";
import { serializePublicStoreItem, storeItemWithRewardsInclude } from "@/lib/store/serialize";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";
import { validateAddToCart, validateCartQuantityUpdate } from "@/lib/store/cart-eligibility";
import { getUserStorePurchaseCounts } from "@/lib/store/fulfill-purchase";
import { notifyCartItemAdded } from "@/lib/store/cart-notifications";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import { localizeStoreItems } from "@/lib/store/localize-items";

const cartInclude = {
  items: {
    orderBy: { updatedAt: "desc" as const },
    include: {
      storeItem: { include: storeItemWithRewardsInclude },
    },
  },
} as const;

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.storeCart.findUnique({
    where: { userId },
    include: cartInclude,
  });
  if (existing) return existing;

  return prisma.storeCart.create({
    data: { userId },
    include: cartInclude,
  });
}

async function reloadCart(cartId: string) {
  return prisma.storeCart.findUniqueOrThrow({
    where: { id: cartId },
    include: cartInclude,
  });
}

export async function addStoreItemToCart(userId: string, storeItemId: string, quantity = 1) {
  const qty = Math.max(1, Math.min(99, quantity));
  const item = await prisma.storeItem.findUnique({
    where: { id: storeItemId },
    include: storeItemWithRewardsInclude,
  });
  if (!item || !item.enabled) {
    throw new CsgoApiError("Item não disponível na loja.", 404);
  }
  if (item.coinShopOnly) {
    throw new CsgoApiError(
      "Este item só pode ser comprado com moedas na Loja de Moedas.",
      409,
    );
  }
  if (item.rewards.length === 0) {
    throw new CsgoApiError("Item sem recompensas configuradas.", 400);
  }

  const cart = await getOrCreateCart(userId);

  await validateAddToCart(
    userId,
    item,
    cart.items.map((row) => ({ storeItemId: row.storeItemId, quantity: row.quantity })),
  );

  await prisma.storeCartItem.create({
    data: { cartId: cart.id, storeItemId, quantity: qty },
  });

  await prisma.storeCart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  await notifyCartItemAdded(userId, item.name, qty);

  return serializeCartForUser(userId, await reloadCart(cart.id));
}

export async function updateCartItemQuantity(
  userId: string,
  storeItemId: string,
  quantity: number,
) {
  const cart = await getOrCreateCart(userId);
  const row = cart.items.find((item) => item.storeItemId === storeItemId);
  if (!row) {
    throw new CsgoApiError("Item não está no carrinho.", 404);
  }

  if (quantity > 0) {
    const purchaseCounts = await getUserStorePurchaseCounts(userId, [storeItemId]);
    await validateCartQuantityUpdate(
      userId,
      row.storeItem,
      quantity,
      purchaseCounts.get(storeItemId) ?? 0,
    );
  }

  if (quantity <= 0) {
    await prisma.storeCartItem.delete({ where: { id: row.id } });
  } else {
    await prisma.storeCartItem.update({
      where: { id: row.id },
      data: { quantity: Math.min(99, quantity) },
    });
  }

  await prisma.storeCart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return serializeCartForUser(userId, await reloadCart(cart.id));
}

export async function removeCartItem(userId: string, storeItemId: string) {
  return updateCartItemQuantity(userId, storeItemId, 0);
}

export async function clearCart(userId: string) {
  const cart = await prisma.storeCart.findUnique({ where: { userId } });
  if (!cart) {
    return { items: [], itemCount: 0, subtotalCents: 0, subtotal: "R$ 0,00" };
  }
  await prisma.storeCartItem.deleteMany({ where: { cartId: cart.id } });
  return serializeCartForUser(userId, await reloadCart(cart.id));
}

export async function serializeCartForUser(
  userId: string,
  cart: Awaited<ReturnType<typeof getOrCreateCart>>,
  locale: Locale = defaultLocale,
) {
  const storeItems = cart.items.map((row) => row.storeItem);
  const localizedById = new Map(
    (await localizeStoreItems(storeItems, locale)).map((item) => [item.id, item]),
  );
  const itemIds = storeItems.map((item) => item.id);
  const [ownedSkinIds, purchaseCounts, agentByDef, stickerByDef] = await Promise.all([
    getOwnedCatalogSkinIdsForUser(userId),
    getUserStorePurchaseCounts(userId, itemIds),
    loadAgentPreviewMap(collectAgentDefIndexesFromStoreItems(storeItems)),
    loadStickerPreviewMap(collectStickerDefIndexesFromStoreItems(storeItems)),
  ]);

  let subtotalCents = 0;
  let itemCount = 0;

  const items = cart.items.map((row) => {
    const storeItem = localizedById.get(row.storeItem.id) ?? row.storeItem;
    const serialized = serializePublicStoreItem(storeItem, {
      purchaseCount: purchaseCounts.get(row.storeItem.id) ?? 0,
      ownedSkinIds,
      agentByDef,
      stickerByDef,
    });
    subtotalCents += serialized.priceCents * row.quantity;
    itemCount += row.quantity;
    return {
      storeItemId: row.storeItemId,
      quantity: row.quantity,
      lineTotalCents: serialized.priceCents * row.quantity,
      item: serialized,
    };
  });

  const { formatPriceCents } = await import("@/lib/serializers");

  return {
    id: cart.id,
    itemCount,
    subtotalCents,
    subtotal: formatPriceCents(subtotalCents),
    items,
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export async function getCartSummaryForUser(userId: string, locale: Locale = defaultLocale) {
  const cart = await getOrCreateCart(userId);
  return serializeCartForUser(userId, cart, locale);
}

export async function getCartItemCount(userId: string): Promise<number> {
  const cart = await prisma.storeCart.findUnique({
    where: { userId },
    include: { items: { select: { quantity: true } } },
  });
  if (!cart) return 0;
  return cart.items.reduce((sum, row) => sum + row.quantity, 0);
}
