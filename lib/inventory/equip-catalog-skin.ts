import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { canUserAccessAllCatalogSkins } from "@/lib/inventory/catalog-access";
import { userOwnsCatalogSkin } from "@/lib/inventory/inventory-ownership";
import { assertPaintkitCsgoCompatible, isCatalogGameClientCs2 } from "@/lib/inventory/csgo-paintkit-compat";
import { getCatalogIdsToUnequipOnEquip } from "@/lib/inventory/equip-slot-rules";
import {
  buildBothTeamsEquipCreateData,
  buildBothTeamsEquipUpdateData,
  buildTeamEquipCreateData,
  buildTeamEquipUpdateData,
  unequipSlotForTeam,
} from "@/lib/inventory/loadout-equip-helpers";
import {
  weaponAllowedOnTeam,
  weaponSupportsBothTeams,
  type EquipSide,
  type LoadoutTeam,
} from "@/lib/inventory/loadout-team";
import type { InventoryCategoryKey } from "@/lib/profile";
import { DEFAULT_SKIN_FLOAT } from "@/lib/inventory/skin-wear";

export async function equipCatalogSkinForUser(
  userId: string,
  catalogSkinId: string,
  team: EquipSide,
) {
  const canAccessAll = await canUserAccessAllCatalogSkins(userId);
  if (!canAccessAll && !(await userOwnsCatalogSkin(userId, catalogSkinId))) {
    throw new CsgoApiError("Você não possui esta skin no inventário.", 403);
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

  if (isCatalogGameClientCs2(catalog.gameClient)) {
    throw new CsgoApiError(
      "Esta skin é do CS2 e não funciona no servidor CS:GO. Escolha outra skin.",
      400,
    );
  }
  await assertPaintkitCsgoCompatible(catalog.weaponId, catalog.paintkit, true);

  const weaponId = catalog.weaponId;
  const category = catalog.category as InventoryCategoryKey;

  if (team === "both") {
    if (!weaponSupportsBothTeams(weaponId)) {
      throw new CsgoApiError(
        "Esta arma só pode ser equipada em um time (TR ou CT).",
        400,
      );
    }
  } else if (!weaponAllowedOnTeam(weaponId, team)) {
    throw new CsgoApiError(
      team === "T"
        ? "Esta arma não está disponível para o time Terrorista."
        : "Esta arma não está disponível para o time Counter-Terrorist.",
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    const catalogIdsForSlot = await getCatalogIdsToUnequipOnEquip(tx, weaponId);

    if (team === "both") {
      await unequipSlotForTeam(tx, user.steamId!, catalogIdsForSlot, "T");
      await unequipSlotForTeam(tx, user.steamId!, catalogIdsForSlot, "CT");
    } else {
      await unequipSlotForTeam(tx, user.steamId!, catalogIdsForSlot, team);
    }

    let playerSkin = await tx.csgoPlayerSkin.findFirst({
      where: { steamId: user.steamId!, skinId: catalog.id },
    });

    if (!playerSkin) {
      playerSkin = await tx.csgoPlayerSkin.create({
        data:
          team === "both"
            ? buildBothTeamsEquipCreateData({
                steamId: user.steamId!,
                skinId: catalog.id,
                floatValue: DEFAULT_SKIN_FLOAT,
                seed: 0,
                stattrak: false,
              })
            : buildTeamEquipCreateData(team as LoadoutTeam, {
                steamId: user.steamId!,
                skinId: catalog.id,
                floatValue: DEFAULT_SKIN_FLOAT,
                seed: 0,
                stattrak: false,
              }),
      });
    } else {
      playerSkin = await tx.csgoPlayerSkin.update({
        where: { id: playerSkin.id },
        data:
          team === "both"
            ? buildBothTeamsEquipUpdateData()
            : buildTeamEquipUpdateData(team as LoadoutTeam, playerSkin),
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
    team,
    name: `${catalog.weaponName} | ${catalog.paintkitName}`,
    equippedAt: new Date().toISOString(),
  };
}
