import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
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
import type { InventoryCategory } from "@/lib/generated/prisma/client";

const CATEGORY_WEAPON_SLOT: Partial<Record<InventoryCategory, string>> = {
  KNIFE: "weapon_knife",
  RIFLE: "weapon_ak47",
  PISTOL: "weapon_deagle",
  SMG: "weapon_mp9",
};

export async function equipInventoryItemForUser(
  userId: string,
  inventoryItemId: string,
  team: EquipSide,
) {
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

  if (team === "both") {
    if (!weaponSupportsBothTeams(weaponId)) {
      throw new CsgoApiError("Esta arma só pode ser equipada em um time (TR ou CT).", 400);
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
                wear: "field_tested",
                seed: 0,
                stattrak: false,
              })
            : buildTeamEquipCreateData(team as LoadoutTeam, {
                steamId: user.steamId!,
                skinId: catalog.id,
                wear: "field_tested",
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
    steamId: user.steamId,
    weaponId,
    paintkit: catalog.paintkit,
    category: item.category,
    team,
    slotWeaponId: CATEGORY_WEAPON_SLOT[item.category] ?? weaponId,
  };
}
