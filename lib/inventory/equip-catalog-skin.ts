import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { isAllSkinsEquipEnabled } from "@/lib/inventory/catalog-access";
import { getCatalogIdsToUnequipOnEquip } from "@/lib/inventory/equip-slot-rules";
import type { InventoryCategoryKey } from "@/lib/profile";

export async function equipCatalogSkinForUser(userId: string, catalogSkinId: string) {
  if (!isAllSkinsEquipEnabled()) {
    throw new CsgoApiError("Catálogo completo não habilitado para esta conta.", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, steamId: true },
  });
  if (!user) throw new CsgoApiError("Usuário não encontrado.", 404);
  if (!user.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para equipar skins no servidor.", 400);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) throw new CsgoApiError("Skin não encontrada no catálogo.", 404);

  const weaponId = catalog.weaponId;
  const category = catalog.category as InventoryCategoryKey;

  await prisma.$transaction(async (tx) => {
    const catalogIdsForSlot = await getCatalogIdsToUnequipOnEquip(tx, weaponId);

    await tx.csgoPlayerSkin.updateMany({
      where: {
        steamId: user.steamId!,
        equipped: true,
        skinId: { in: catalogIdsForSlot },
      },
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
    catalogSkinId: catalog.id,
    steamId: user.steamId,
    weaponId,
    paintkit: catalog.paintkit,
    category,
    name: `${catalog.weaponName} | ${catalog.paintkitName}`,
    equippedAt: new Date().toISOString(),
  };
}
