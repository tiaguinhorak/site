import "server-only";

import { prisma } from "@/lib/prisma";
import type { InventoryCategoryKey } from "@/lib/profile";
import { getUserCatalogAccess } from "@/lib/inventory/user-catalog-access-cache";
import { getEquippedRowsCached } from "@/lib/inventory/equipped-rows-cache";
import {
  ensureCatalogReady,
  getCatalogTotalCached,
} from "@/lib/inventory/ensure-catalog-synced";
import { getCatalogWeaponOptions } from "@/lib/inventory/get-catalog-weapon-options";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { resolveCatalogSkinImageUrl } from "@/lib/inventory/skin-images";
import {
  excludedWeaponIdsForDualTeam,
  excludedWeaponIdsForTeam,
  teamEquipField,
  weaponAllowedOnTeam,
  weaponSupportsBothTeams,
  type LoadoutTeam,
} from "@/lib/inventory/loadout-team";
import { prismaRarityTierWhere } from "@/lib/inventory/rarity-filter";
import { getCatalogRarityTiers } from "@/lib/inventory/get-catalog-rarity-tiers";
import { getCatalogRowsCached } from "@/lib/inventory/catalog-rows-cache";
import { getUserSteamIdCached } from "@/lib/inventory/user-steam-id-cache";
import type { RarityKey } from "@/lib/inventory/rarity-tiers";

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
  equippedT: boolean;
  equippedCT: boolean;
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
    dualTeamOnly?: boolean;
    rarityTier?: RarityKey;
    ownedOnly?: boolean;
  },
): Promise<{
  items: CatalogSkinRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  catalogTotal: number;
  weaponOptions: Awaited<ReturnType<typeof getCatalogWeaponOptions>>;
  availableRarityTiers: RarityKey[];
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const search = options.search?.trim() ?? "";
  const category = options.category ?? "all";
  const weaponIdParam = options.weaponId?.trim() ?? "";
  const team = options.team;
  const dualTeamOnly = options.dualTeamOnly ?? false;
  const rarityTier = options.rarityTier;
  const ownedOnly = options.ownedOnly ?? false;

  await ensureCatalogReady();

  let weaponIdWhere: string | { notIn: string[] } | undefined;
  if (weaponIdParam) {
    weaponIdWhere = weaponIdParam;
  } else if (dualTeamOnly) {
    const excluded = excludedWeaponIdsForDualTeam();
    if (excluded.length > 0) {
      weaponIdWhere = { notIn: excluded };
    }
  } else if (team) {
    const excluded = excludedWeaponIdsForTeam(team);
    if (excluded.length > 0) {
      weaponIdWhere = { notIn: excluded };
    }
  }

  const andClauses: Array<Record<string, unknown>> = [];
  if (category !== "all") andClauses.push({ category });
  if (weaponIdWhere !== undefined) andClauses.push({ weaponId: weaponIdWhere });
  if (search) {
    andClauses.push({
      OR: [
        { paintkitName: { contains: search, mode: "insensitive" as const } },
        { weaponName: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }
  if (rarityTier) {
    andClauses.push(prismaRarityTierWhere(rarityTier));
  }

  const access = await getUserCatalogAccess(userId);
  const allSkins = access.allSkins;
  const ownedCatalogIds = access.ownedIds;

  if (ownedOnly && !allSkins) {
    const ownedList = ownedCatalogIds ? [...ownedCatalogIds] : [];
    if (ownedList.length === 0) {
      const weaponOptions =
        page === 1
          ? await getCatalogWeaponOptions(category).catch(() => [])
          : [];
      return {
        items: [],
        page,
        limit,
        total: 0,
        totalPages: 1,
        catalogTotal: await getCatalogTotalCached(),
        weaponOptions,
        availableRarityTiers: await getCatalogRarityTiers(),
      };
    }
    andClauses.push({ id: { in: ownedList } });
  }

  const where = {
    enabled: true,
    gameClient: { not: "cs2" as const },
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };

  let steamId: string | null = null;
  try {
    steamId = await getUserSteamIdCached(userId);
  } catch {
    // user has no steam linked — equip state will be empty
  }

  const equippedField = team ? teamEquipField(team) : null;

  const cacheParams = {
    category,
    search,
    weaponId: weaponIdParam,
    page,
    limit,
    team,
    dualTeamOnly,
    rarityTier,
  };

  const [catalogTotal, equippedRows, { rows, count: total }, weaponOptions, availableRarityTiers] =
    await Promise.all([
    getCatalogTotalCached(),
    steamId
      ? getEquippedRowsCached(steamId)
      : Promise.resolve([]),
    getCatalogRowsCached(cacheParams, where),
    page === 1
      ? getCatalogWeaponOptions(category).catch(() => [])
      : Promise.resolve([]),
    getCatalogRarityTiers(),
  ]);

  const equippedBySkin = new Map(
    equippedRows.map((row) => [row.skinId, { equippedT: row.equippedT, equippedCT: row.equippedCT }]),
  );

  const items: CatalogSkinRow[] = rows.map((row) => {
    const flags = equippedBySkin.get(row.id);
    const equippedT = flags?.equippedT ?? false;
    const equippedCT = flags?.equippedCT ?? false;
    return {
      id: row.id,
      name: `${row.weaponName} | ${row.paintkitName}`,
      category: row.category as InventoryCategoryKey,
      rarity: row.rarity,
      accent: rarityAccent(row.rarity),
      imageUrl: resolveCatalogSkinImageUrl(row.imageUrl, row.id),
      weaponId: row.weaponId,
      weaponName: row.weaponName,
      paintkit: row.paintkit,
      paintkitName: row.paintkitName,
      equipped: equippedT || equippedCT,
      equippedT,
      equippedCT,
      owned: allSkins || ownedCatalogIds?.has(row.id) === true,
    };
  });

  const filteredWeaponOptions = dualTeamOnly
    ? weaponOptions.filter((w) => weaponSupportsBothTeams(w.weaponId))
    : team
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
    availableRarityTiers,
  };
}
