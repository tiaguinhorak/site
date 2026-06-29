import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getStoreItems } from "@/lib/queries";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";
import { getUserStorePurchaseCounts } from "@/lib/store/fulfill-purchase";
import { serializePublicStoreItem } from "@/lib/store/serialize";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  const items = await getStoreItems(true);

  const itemIds = items.map((item) => item.id);
  const [ownedSkinIds, purchaseCounts] = userId
    ? await Promise.all([
        getOwnedCatalogSkinIdsForUser(userId),
        getUserStorePurchaseCounts(userId, itemIds),
      ])
    : [new Set<string>(), new Map<string, number>()];

  return NextResponse.json({
    items: items.map((item) =>
      serializePublicStoreItem(item, {
        purchaseCount: purchaseCounts.get(item.id) ?? 0,
        ownedSkinIds,
      }),
    ),
  });
}
