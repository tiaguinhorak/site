import "server-only";

import { prisma } from "@/lib/prisma";
import type { InventoryCategoryKey } from "@/lib/profile";
import { isAllSkinsEquipEnabled } from "@/lib/inventory/catalog-access";
import { ensureCatalogSynced } from "@/lib/inventory/ensure-catalog-synced";
import { getCatalogWeaponOptions } from "@/lib/inventory/get-catalog-weapon-options";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";

const DEFAULT_LIMIT = 36;
const MAX_LIMIT = 72;

export type CatalogSkinRow = {
  id: string;
  name: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  imageUrl: string | null;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
  equipped: boolean;
  owned: boolean;
};

export async function getCatalogSkinsForUser(
  userId: string,
  options: {
    category?: InventoryCategoryKey | "all";
    search?: string;
    weaponId?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  items: CatalogSkinRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  catalogTotal: number;
  weaponOptions: Awaited<ReturnType<typeof getCatalogWeaponOptions>>;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const search = options.search?.trim() ?? "";
  const category = options.category ?? "all";
  const weaponFilter = options.weaponId?.trim() ?? "";

  const { synced: catalogTotal } = await ensureCatalogSynced();

  const where = {
    ...(category !== "all" ? { category } : {}),
    ...(weaponFilter ? { weaponId: weaponFilter } : {}),
    ...(search
      ? {
          OR: [
            { paintkitName: { contains: search, mode: "insensitive" as const } },
            { weaponName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });

  const [equippedRows, total, rows, weaponOptions] = await Promise.all([
    user?.steamId
      ? prisma.csgoPlayerSkin.findMany({
          where: { steamId: user.steamId, equipped: true },
          select: { skinId: true },
        })
      : Promise.resolve([]),
    prisma.csgoSkinCatalog.count({ where }),
    prisma.csgoSkinCatalog.findMany({
      where,
      orderBy: [{ weaponName: "asc" }, { paintkitName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    page === 1 ? getCatalogWeaponOptions(category) : Promise.resolve([]),
  ]);

  const equippedIds = new Set(equippedRows.map((row) => row.skinId));
  const allSkins = isAllSkinsEquipEnabled();

  const items: CatalogSkinRow[] = rows.map((row) => ({
    id: row.id,
    name: `${row.weaponName} | ${row.paintkitName}`,
    category: row.category as InventoryCategoryKey,
    rarity: row.rarity,
    accent: rarityAccent(row.rarity),
    imageUrl: row.imageUrl ?? catalogSkinImageUrl(row.id) ?? null,
    weaponId: row.weaponId,
    weaponName: row.weaponName,
    paintkit: row.paintkit,
    paintkitName: row.paintkitName,
    equipped: equippedIds.has(row.id),
    owned: allSkins,
  }));

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    catalogTotal,
    weaponOptions,
  };
}
