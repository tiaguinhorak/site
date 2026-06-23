import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { getCatalogIdsToUnequipOnEquip } from "@/lib/inventory/equip-slot-rules";
import { unequipSlotForTeam } from "@/lib/inventory/loadout-equip-helpers";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

export async function unequipCatalogSkinForUser(
  userId: string,
  catalogSkinId: string,
  team: LoadoutTeam,
) {
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

  const catalogIdsForSlot = await getCatalogIdsToUnequipOnEquip(prisma, catalog.weaponId);
  await unequipSlotForTeam(prisma, user.steamId, catalogIdsForSlot, team);

  return {
    ok: true,
    steamId: user.steamId,
    catalogSkinId,
    weaponId: catalog.weaponId,
    team,
    unequipped: true,
  };
}

export async function unequipWeaponForUser(
  userId: string,
  weaponId: string,
  team: LoadoutTeam,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user?.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para gerenciar skins no servidor.", 400);
  }

  const catalogIdsForSlot = await getCatalogIdsToUnequipOnEquip(prisma, weaponId);

  if (!catalogIdsForSlot.length) {
    throw new CsgoApiError("Arma não encontrada no catálogo.", 404);
  }

  await unequipSlotForTeam(prisma, user.steamId, catalogIdsForSlot, team);

  return { ok: true, steamId: user.steamId, weaponId, team, unequipped: true };
}
