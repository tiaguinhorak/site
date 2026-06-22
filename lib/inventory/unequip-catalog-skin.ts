import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { isAllSkinsEquipEnabled } from "@/lib/inventory/catalog-access";

export async function unequipCatalogSkinForUser(
  userId: string,
  catalogSkinId: string,
) {
  if (!isAllSkinsEquipEnabled()) {
    throw new CsgoApiError("Catálogo completo não habilitado para esta conta.", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user?.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para gerenciar skins no servidor.", 400);
  }

  const catalog = await prisma.csgoSkinCatalog.findUnique({
    where: { id: catalogSkinId },
  });
  if (!catalog) throw new CsgoApiError("Skin não encontrada no catálogo.", 404);

  const catalogIdsForWeapon = (
    await prisma.csgoSkinCatalog.findMany({
      where: { weaponId: catalog.weaponId },
      select: { id: true },
    })
  ).map((s) => s.id);

  await prisma.csgoPlayerSkin.updateMany({
    where: {
      steamId: user.steamId,
      equipped: true,
      skinId: { in: catalogIdsForWeapon },
    },
    data: { equipped: false },
  });

  return {
    ok: true,
    catalogSkinId,
    weaponId: catalog.weaponId,
    unequipped: true,
  };
}

export async function unequipWeaponForUser(userId: string, weaponId: string) {
  if (!isAllSkinsEquipEnabled()) {
    throw new CsgoApiError("Catálogo completo não habilitado para esta conta.", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user?.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para gerenciar skins no servidor.", 400);
  }

  const catalogIdsForWeapon = (
    await prisma.csgoSkinCatalog.findMany({
      where: { weaponId },
      select: { id: true },
    })
  ).map((s) => s.id);

  if (!catalogIdsForWeapon.length) {
    throw new CsgoApiError("Arma não encontrada no catálogo.", 404);
  }

  await prisma.csgoPlayerSkin.updateMany({
    where: {
      steamId: user.steamId,
      equipped: true,
      skinId: { in: catalogIdsForWeapon },
    },
    data: { equipped: false },
  });

  return { ok: true, weaponId, unequipped: true };
}
