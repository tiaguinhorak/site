import "server-only";

import { prisma } from "@/lib/prisma";
import type { InventoryCategoryKey } from "@/lib/profile";
import { canUserAccessAllCatalogSkins } from "@/lib/inventory/catalog-access";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";
import {
  ensureCatalogReady,
  getCatalogTotalCached,
} from "@/lib/inventory/ensure-catalog-synced";
import { getCatalogWeaponOptions } from "@/lib/inventory/get-catalog-weapon-options";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import {
  excludedWeaponIdsForTeam,
  teamEquipField,
  weaponAllowedOnTeam,
  type LoadoutTeam,
} from "@/lib/inventory/loadout-team";

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
    team?: LoadoutTeam;
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
  const weaponIdParam = options.weaponId?.trim() ?? "";
  const team = options.team;

  await ensureCatalogReady();

  let weaponIdWhere: string | { notIn: string[] } | undefined;
  if (weaponIdParam) {
    // Explicit weapon from dropdown — do not overwrite with team notIn (was breaking filters).
    weaponIdWhere = weaponIdParam;
  } else if (team) {
    const excluded = excludedWeaponIdsForTeam(team);
    if (excluded.length > 0) {
      weaponIdWhere = { notIn: excluded };
    }
  }

  const where = {
    enabled: true,
    gameClient: { not: "cs2" as const },
    ...(category !== "all" ? { category } : {}),
    ...(weaponIdWhere !== undefined ? { weaponId: weaponIdWhere } : {}),
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

  const equippedField = team ? teamEquipField(team) : null;

  const [catalogTotal, equippedRows, total, rows, weaponOptions] = await Promise.all([
    getCatalogTotalCached(),
    user?.steamId
      ? prisma.csgoPlayerSkin.findMany({
          where: {
            steamId: user.steamId,
            ...(equippedField ? { [equippedField]: true } : { equipped: true }),
          },
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
    page === 1
      ? getCatalogWeaponOptions(category).catch(() => [])
      : Promise.resolve([]),
  ]);

  const equippedIds = new Set(equippedRows.map((row) => row.skinId));
  const allSkins = await canUserAccessAllCatalogSkins(userId);
  const ownedCatalogIds = allSkins ? null : await getOwnedCatalogSkinIdsForUser(userId);

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
    owned: allSkins || ownedCatalogIds?.has(row.id) === true,
  }));

  const filteredWeaponOptions = team
    ? weaponOptions.filter((w) => weaponAllowedOnTeam(w.weaponId, team))
    : weaponOptions;

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    catalogTotal,
    weaponOptions: filteredWeaponOptions,
  };
}
