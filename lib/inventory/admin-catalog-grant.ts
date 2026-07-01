import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { logAdminAction } from "@/lib/admin/audit";
import { getCatalogIdsToUnequipOnEquip } from "@/lib/inventory/equip-slot-rules";
import { unequipSlotForTeam } from "@/lib/inventory/loadout-equip-helpers";
import {
  ensureInventoryItemForCatalogSkin,
} from "@/lib/inventory/inventory-ownership";
import {
  notifyInventorySkinGranted,
  notifyInventorySkinRevoked,
} from "@/lib/inventory/inventory-notifications";
import { pushPlayerLoadoutToGameServer } from "@/lib/inventory/push-loadout-to-game-server";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { rarityAccent } from "@/lib/inventory/catalog-categories";
import { invalidateUserCatalogAccess } from "@/lib/inventory/user-catalog-access-cache";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";
import type { InventoryCategoryKey } from "@/lib/profile";

export type UserGrantedCatalogSkin = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  weaponName: string;
  paintkitName: string;
  category: InventoryCategoryKey;
  rarity: string;
  accent: string;
  imageUrl: string | null;
  inventoryItemId: string;
};

function formatSkinName(weaponName: string, paintkitName: string): string {
  return `${weaponName} | ${paintkitName}`;
}

export async function listUserGrantedCatalogSkins(userId: string): Promise<UserGrantedCatalogSkin[]> {
  const rows = await prisma.userInventoryItem.findMany({
    where: {
      userId,
      owned: true,
      inventoryItem: { catalogSkinId: { not: null } },
    },
    include: {
      inventoryItem: {
        include: { catalogSkin: true },
      },
    },
    orderBy: { inventoryItem: { name: "asc" } },
  });

  const items: UserGrantedCatalogSkin[] = [];
  for (const row of rows) {
    const catalogSkinId = row.inventoryItem.catalogSkinId;
    if (!catalogSkinId) continue;

    const catalog = row.inventoryItem.catalogSkin;
    if (catalog) {
      items.push({
        catalogSkinId,
        name: formatSkinName(catalog.weaponName, catalog.paintkitName),
        weaponId: catalog.weaponId,
        weaponName: catalog.weaponName,
        paintkitName: catalog.paintkitName,
        category: catalog.category as InventoryCategoryKey,
        rarity: catalog.rarity,
        accent: rarityAccent(catalog.rarity),
        imageUrl: catalog.imageUrl ?? catalogSkinImageUrl(catalog.id) ?? null,
        inventoryItemId: row.inventoryItemId,
      });
    } else {
      items.push({
        catalogSkinId,
        name: row.inventoryItem.name,
        weaponId: "",
        weaponName: row.inventoryItem.name,
        paintkitName: "",
        category: row.inventoryItem.category as InventoryCategoryKey,
        rarity: row.inventoryItem.rarity,
        accent: row.inventoryItem.accent,
        imageUrl: row.inventoryItem.imageUrl,
        inventoryItemId: row.inventoryItemId,
      });
    }
  }

  return items;
}

export async function grantCatalogSkinToUser(
  adminId: string,
  userId: string,
  catalogSkinId: string,
  options?: { silentDuplicate?: boolean; skipNotify?: boolean; skipAudit?: boolean },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true },
  });
  if (!user) {
    throw new CsgoApiError("Usuário não encontrado.", 404);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) {
    throw new CsgoApiError("Skin não encontrada no catálogo.", 404);
  }
  if (!catalog.enabled) {
    throw new CsgoApiError("Skin desabilitada no catálogo — habilite antes de conceder.", 400);
  }

  const inventoryItem = await ensureInventoryItemForCatalogSkin(catalogSkinId);
  const skinName = formatSkinName(catalog.weaponName, catalog.paintkitName);

  const existingGrant = await prisma.userInventoryItem.findUnique({
    where: {
      userId_inventoryItemId: { userId, inventoryItemId: inventoryItem.id },
    },
    select: { owned: true },
  });
  if (existingGrant?.owned) {
    if (options?.silentDuplicate) {
      return {
        ok: true,
        catalogSkinId,
        name: skinName,
        userId,
        skipped: true,
      };
    }
    throw new CsgoApiError("O jogador já possui esta skin.", 409);
  }

  await prisma.userInventoryItem.upsert({
    where: {
      userId_inventoryItemId: { userId, inventoryItemId: inventoryItem.id },
    },
    create: {
      userId,
      inventoryItemId: inventoryItem.id,
      owned: true,
      equipped: false,
    },
    update: {
      owned: true,
    },
  });

  invalidateUserCatalogAccess(userId);

  if (!options?.skipNotify) {
    await notifyInventorySkinGranted(userId, skinName, catalogSkinId);
  }

  if (!options?.skipAudit) {
    await logAdminAction({
      adminId,
      action: "INVENTORY_GRANT",
      targetType: "user",
      targetId: userId,
      summary: `Concedida skin ${skinName} para ${user.nickname}`,
      metadata: { catalogSkinId, inventoryItemId: inventoryItem.id },
    });
  }

  return {
    ok: true,
    catalogSkinId,
    name: skinName,
    userId,
  };
}

export async function revokeCatalogSkinFromUser(
  adminId: string,
  userId: string,
  catalogSkinId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, steamId: true },
  });
  if (!user) {
    throw new CsgoApiError("Usuário não encontrado.", 404);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) {
    throw new CsgoApiError("Skin não encontrada no catálogo.", 404);
  }

  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { catalogSkinId },
  });
  if (!inventoryItem) {
    throw new CsgoApiError("Skin não vinculada ao inventário.", 404);
  }

  const skinName = formatSkinName(catalog.weaponName, catalog.paintkitName);

  await prisma.userInventoryItem.updateMany({
    where: { userId, inventoryItemId: inventoryItem.id },
    data: { owned: false, equipped: false },
  });

  invalidateUserCatalogAccess(userId);

  if (user.steamId) {
    const catalogIdsForSlot = await getCatalogIdsToUnequipOnEquip(prisma, catalog.weaponId);
    await unequipSlotForTeam(prisma, user.steamId, catalogIdsForSlot, "T");
    await unequipSlotForTeam(prisma, user.steamId, catalogIdsForSlot, "CT");

    await prisma.csgoPlayerSkin.updateMany({
      where: { steamId: user.steamId, skinId: catalogSkinId },
      data: { equipped: false, equippedT: false, equippedCT: false },
    });

    await pushPlayerLoadoutToGameServer(user.steamId);
  }

  await notifyInventorySkinRevoked(userId, skinName);

  await logAdminAction({
    adminId,
    action: "INVENTORY_REVOKE",
    targetType: "user",
    targetId: userId,
    summary: `Removida skin ${skinName} de ${user.nickname}`,
    metadata: { catalogSkinId, inventoryItemId: inventoryItem.id },
  });

  return {
    ok: true,
    catalogSkinId,
    name: skinName,
    userId,
  };
}

export type AdminGrantCatalogSkinRow = {
  id: string;
  weaponId: string;
  weaponName: string;
  paintkit: number;
  paintkitName: string;
  rarity: string;
  category: string;
  imageUrl: string | null;
  enabled: boolean;
  name: string;
  accent: string;
  ownedByUser: boolean;
};

export async function listCatalogSkinsForUserGrant(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    weaponId?: string;
    category?: "all" | "knife" | "gloves" | "rifle" | "pistol" | "smg";
    ownership?: "all" | "owned" | "missing";
  },
): Promise<{
  items: AdminGrantCatalogSkinRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  ownedCount: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(72, Math.max(1, options.limit ?? 36));
  const search = options.search?.trim() ?? "";
  const ownership = options.ownership ?? "all";

  const ownedIds = await getOwnedCatalogSkinIdsForUser(userId);
  const ownedList = [...ownedIds];

  const { catalogPickerCategoryPrismaFilter } = await import(
    "@/lib/inventory/catalog-categories"
  );
  const categoryFilter =
    options.category && options.category !== "all"
      ? catalogPickerCategoryPrismaFilter(options.category)
      : {};

  const andClauses: Array<Record<string, unknown>> = [
    { enabled: true, gameClient: { not: "cs2" as const } },
    categoryFilter,
  ];

  if (options.weaponId) {
    andClauses.push({ weaponId: options.weaponId });
  }

  if (search) {
    andClauses.push({
      OR: [
        { paintkitName: { contains: search, mode: "insensitive" as const } },
        { weaponName: { contains: search, mode: "insensitive" as const } },
        { weaponId: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }

  if (ownership === "owned") {
    if (ownedList.length === 0) {
      return {
        items: [],
        page,
        limit,
        total: 0,
        totalPages: 1,
        ownedCount: 0,
      };
    }
    andClauses.push({ id: { in: ownedList } });
  } else if (ownership === "missing" && ownedList.length > 0) {
    andClauses.push({ id: { notIn: ownedList } });
  }

  const where = { AND: andClauses };

  const [total, rows] = await Promise.all([
    prisma.csgoSkinCatalog.count({ where }),
    prisma.csgoSkinCatalog.findMany({
      where,
      orderBy: [{ weaponName: "asc" }, { paintkitName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      weaponId: row.weaponId,
      weaponName: row.weaponName,
      paintkit: row.paintkit,
      paintkitName: row.paintkitName,
      rarity: row.rarity,
      category: row.category,
      imageUrl: row.imageUrl ?? catalogSkinImageUrl(row.id) ?? null,
      enabled: row.enabled,
      name: formatSkinName(row.weaponName, row.paintkitName),
      accent: rarityAccent(row.rarity),
      ownedByUser: ownedIds.has(row.id),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    ownedCount: ownedList.length,
  };
}

export async function grantCatalogSkinsToUserBulk(
  adminId: string,
  userId: string,
  catalogSkinIds: string[],
) {
  const uniqueIds = [...new Set(catalogSkinIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new CsgoApiError("Selecione ao menos uma skin.", 400);
  }

  const granted: string[] = [];
  const skipped: string[] = [];

  for (const catalogSkinId of uniqueIds) {
    const result = await grantCatalogSkinToUser(adminId, userId, catalogSkinId, {
      silentDuplicate: true,
      skipNotify: true,
      skipAudit: true,
    });
    if ("skipped" in result && result.skipped) {
      skipped.push(catalogSkinId);
    } else {
      granted.push(catalogSkinId);
    }
  }

  invalidateUserCatalogAccess(userId);

  if (granted.length === 1) {
    const catalog = await prisma.csgoSkinCatalog.findUnique({
      where: { id: granted[0] },
    });
    if (catalog) {
      await notifyInventorySkinGranted(
        userId,
        formatSkinName(catalog.weaponName, catalog.paintkitName),
        granted[0],
      );
    }
  } else if (granted.length > 1) {
    await notifyInventorySkinGranted(userId, `${granted.length} skins`, granted[0]!);
  }

  await logAdminAction({
    adminId,
    action: "INVENTORY_GRANT",
    targetType: "user",
    targetId: userId,
    summary: `Concedidas ${granted.length} skin(s) em lote (${skipped.length} já possuíam)`,
    metadata: { catalogSkinIds: granted, skipped },
  });

  return {
    ok: true,
    granted,
    skipped,
    grantedCount: granted.length,
    skippedCount: skipped.length,
  };
}
