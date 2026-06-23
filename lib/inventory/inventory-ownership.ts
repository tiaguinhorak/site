import "server-only";

import type { InventoryCategory, InventoryRarity } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { rarityAccent } from "@/lib/inventory/catalog-categories";

function mapCatalogRarityToInventory(rarity: string): InventoryRarity {
  const value = rarity.toLowerCase();
  if (
    value.includes("ancient") ||
    value.includes("contraband") ||
    value.includes("mítico") ||
    value.includes("mitico")
  ) {
    return "MITICO";
  }
  if (value.includes("legendary") || value.includes("lendário") || value.includes("lendario")) {
    return "LENDARIO";
  }
  if (
    value.includes("mythical") ||
    value.includes("classified") ||
    value.includes("épico") ||
    value.includes("epico")
  ) {
    return "EPICO";
  }
  if (value.includes("rare") || value.includes("restricted") || value.includes("raro")) {
    return "RARO";
  }
  return "COMUM";
}

export async function ensureInventoryItemForCatalogSkin(catalogSkinId: string) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { catalogSkinId },
  });
  if (existing) {
    return existing;
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) {
    throw new CsgoApiError("Skin não encontrada no catálogo.", 404);
  }

  return prisma.inventoryItem.create({
    data: {
      name: `${catalog.weaponName} | ${catalog.paintkitName}`,
      category: catalog.category as InventoryCategory,
      rarity: mapCatalogRarityToInventory(catalog.rarity),
      accent: rarityAccent(catalog.rarity),
      sortOrder: 0,
      catalogSkinId: catalog.id,
      imageUrl: catalog.imageUrl,
    },
  });
}

export async function getOwnedCatalogSkinIdsForUser(userId: string): Promise<Set<string>> {
  const rows = await prisma.userInventoryItem.findMany({
    where: { userId, owned: true },
    include: {
      inventoryItem: {
        select: { catalogSkinId: true },
      },
    },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    const catalogSkinId = row.inventoryItem.catalogSkinId;
    if (catalogSkinId) {
      ids.add(catalogSkinId);
    }
  }
  return ids;
}

export async function userOwnsCatalogSkin(userId: string, catalogSkinId: string): Promise<boolean> {
  const owned = await getOwnedCatalogSkinIdsForUser(userId);
  return owned.has(catalogSkinId);
}
