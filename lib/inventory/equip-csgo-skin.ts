import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import type { InventoryCategory } from "@/lib/generated/prisma/client";

const CATEGORY_WEAPON_SLOT: Partial<Record<InventoryCategory, string>> = {
  KNIFE: "weapon_knife",
  RIFLE: "weapon_ak47",
  PISTOL: "weapon_deagle",
  SMG: "weapon_mp9",
};

export async function equipInventoryItemForUser(userId: string, inventoryItemId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, steamId: true },
  });
  if (!user) throw new CsgoApiError("Usuário não encontrado.", 404);
  if (!user.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para equipar skins no servidor.", 400);
  }

  const owned = await prisma.userInventoryItem.findUnique({
    where: {
      userId_inventoryItemId: { userId, inventoryItemId },
    },
    include: {
      inventoryItem: {
        include: { catalogSkin: true },
      },
    },
  });

  if (!owned?.owned) throw new CsgoApiError("Item não está no seu inventário.", 404);

  const item = owned.inventoryItem;
  if (!item.catalogSkinId || !item.catalogSkin) {
    throw new CsgoApiError("Este item ainda não está ligado a uma skin de CS:GO.", 400);
  }

  const catalog = item.catalogSkin;
  const weaponId = catalog.weaponId;

  await prisma.$transaction(async (tx) => {
    const sameCategoryItems = await tx.inventoryItem.findMany({
      where: { category: item.category },
      select: { id: true },
    });
    const sameCategoryIds = sameCategoryItems.map((i) => i.id);

    await tx.userInventoryItem.updateMany({
      where: { userId, inventoryItemId: { in: sameCategoryIds } },
      data: { equipped: false },
    });

    await tx.userInventoryItem.update({
      where: { userId_inventoryItemId: { userId, inventoryItemId } },
      data: { equipped: true },
    });

    const catalogIdsForWeapon = (
      await tx.csgoSkinCatalog.findMany({
        where: { weaponId },
        select: { id: true },
      })
    ).map((s) => s.id);

    await tx.csgoPlayerSkin.updateMany({
      where: { steamId: user.steamId!, equipped: true, skinId: { in: catalogIdsForWeapon } },
      data: { equipped: false },
    });

    let playerSkin = await tx.csgoPlayerSkin.findFirst({
      where: { steamId: user.steamId!, skinId: catalog.id },
    });

    if (!playerSkin) {
      playerSkin = await tx.csgoPlayerSkin.create({
        data: {
          steamId: user.steamId!,
          skinId: catalog.id,
          wear: "field_tested",
          seed: 0,
          stattrak: false,
          equipped: true,
        },
      });
    } else {
      playerSkin = await tx.csgoPlayerSkin.update({
        where: { id: playerSkin.id },
        data: { equipped: true },
      });
    }
  });

  return {
    ok: true,
    steamId: user.steamId,
    weaponId,
    paintkit: catalog.paintkit,
    category: item.category,
    slotWeaponId: CATEGORY_WEAPON_SLOT[item.category] ?? weaponId,
  };
}
