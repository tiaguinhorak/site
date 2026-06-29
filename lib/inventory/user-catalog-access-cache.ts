import "server-only";

import { canUserAccessAllCatalogSkins } from "@/lib/inventory/catalog-access";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";

const CACHE_MS = 2 * 60 * 1000;

type Entry = {
  allSkins: boolean;
  ownedIds: Set<string> | null;
  at: number;
};

const cache = new Map<string, Entry>();

export async function getUserCatalogAccess(userId: string): Promise<{
  allSkins: boolean;
  ownedIds: Set<string> | null;
}> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { allSkins: cached.allSkins, ownedIds: cached.ownedIds };
  }

  const allSkins = await canUserAccessAllCatalogSkins(userId);
  const ownedIds = allSkins ? null : await getOwnedCatalogSkinIdsForUser(userId);

  cache.set(userId, { allSkins, ownedIds, at: Date.now() });
  return { allSkins, ownedIds };
}

export function invalidateUserCatalogAccess(userId: string): void {
  cache.delete(userId);
}
