import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getStoreItems } from "@/lib/queries";
import { getOrCreateCart } from "@/lib/store/cart-service";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";
import { getUserStorePurchaseCounts } from "@/lib/store/fulfill-purchase";
import { serializePublicStoreItem } from "@/lib/store/serialize";
import {
  collectAgentDefIndexesFromStoreItems,
  loadAgentPreviewMap,
} from "@/lib/store/agent-preview-map";
import {
  collectStickerDefIndexesFromStoreItems,
  loadStickerPreviewMap,
} from "@/lib/store/sticker-preview-map";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  const items = await getStoreItems(true);

  const itemIds = items.map((item) => item.id);
  const [ownedSkinIds, purchaseCounts, agentByDef, stickerByDef, cartStoreItemIds] = await Promise.all([
    userId ? getOwnedCatalogSkinIdsForUser(userId) : Promise.resolve(new Set<string>()),
    userId ? getUserStorePurchaseCounts(userId, itemIds) : Promise.resolve(new Map<string, number>()),
    loadAgentPreviewMap(collectAgentDefIndexesFromStoreItems(items)),
    loadStickerPreviewMap(collectStickerDefIndexesFromStoreItems(items)),
    userId
      ? getOrCreateCart(userId).then((cart) => new Set(cart.items.map((row) => row.storeItemId)))
      : Promise.resolve(new Set<string>()),
  ]);

  return NextResponse.json({
    items: items.map((item) =>
      serializePublicStoreItem(item, {
        purchaseCount: purchaseCounts.get(item.id) ?? 0,
        ownedSkinIds,
        agentByDef,
        stickerByDef,
        cartStoreItemIds,
      }),
    ),
  });
}
