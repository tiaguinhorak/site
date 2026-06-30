import "server-only";

import type { StoreItem, StoreItemReward } from "@/lib/generated/prisma/client";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { validatePurchaseEligibility } from "@/lib/store/fulfill-purchase";

type StoreItemWithRewards = StoreItem & { rewards: StoreItemReward[] };

export async function validateAddToCart(
  userId: string,
  item: StoreItemWithRewards,
  cartRows: { storeItemId: string; quantity: number }[],
): Promise<void> {
  await validatePurchaseEligibility(userId, item);

  const inCart = cartRows.find((row) => row.storeItemId === item.id);
  if (inCart) {
    throw new CsgoApiError("Este item já está no carrinho.", 409);
  }

  if (item.maxPerUser === 1) {
    const cartQtyForItem = cartRows
      .filter((row) => row.storeItemId === item.id)
      .reduce((sum, row) => sum + row.quantity, 0);
    if (cartQtyForItem >= 1) {
      throw new CsgoApiError("Limite de 1 unidade por usuário — item já no carrinho.", 409);
    }
  }
}

export async function validateCartQuantityUpdate(
  userId: string,
  item: StoreItemWithRewards,
  nextQuantity: number,
  purchaseCount: number,
): Promise<void> {
  if (nextQuantity <= 0) return;

  await validatePurchaseEligibility(userId, item);

  if (item.maxPerUser != null) {
    const allowed = item.maxPerUser - purchaseCount;
    if (nextQuantity > allowed) {
      throw new CsgoApiError(
        allowed <= 0
          ? "Você atingiu o limite de compras deste item."
          : `Limite de ${item.maxPerUser} por usuário — máximo ${allowed} no carrinho.`,
        409,
      );
    }
  }

  if (item.maxPerUser === 1 && nextQuantity > 1) {
    throw new CsgoApiError("Este item permite apenas 1 unidade por usuário.", 409);
  }
}
