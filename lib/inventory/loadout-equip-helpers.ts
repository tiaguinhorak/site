import type { Prisma } from "@/lib/generated/prisma/client";
import {
  mergeEquippedFlags,
  teamEquipField,
  type LoadoutTeam,
} from "@/lib/inventory/loadout-team";

type PlayerSkinDb = {
  csgoPlayerSkin: {
    updateMany: (
      args: Prisma.CsgoPlayerSkinUpdateManyArgs,
    ) => Promise<{ count: number }>;
  };
};

export async function unequipSlotForTeam(
  db: PlayerSkinDb,
  steamId: string,
  catalogSkinIds: string[],
  team: LoadoutTeam,
): Promise<void> {
  const field = teamEquipField(team);
  await db.csgoPlayerSkin.updateMany({
    where: {
      steamId,
      skinId: { in: catalogSkinIds },
      [field]: true,
    },
    data: {
      [field]: false,
      equipped: false,
    },
  });

  // Re-enable global flag when the same skin stays equipped on the other side.
  await db.csgoPlayerSkin.updateMany({
    where: {
      steamId,
      skinId: { in: catalogSkinIds },
      OR: [{ equippedT: true }, { equippedCT: true }],
    },
    data: { equipped: true },
  });
}

export function buildTeamEquipCreateData(
  team: LoadoutTeam,
  base: {
    steamId: string;
    skinId: string;
    wear: "factory_new" | "minimal_wear" | "field_tested" | "well_worn" | "battle_scarred";
    seed: number;
    stattrak: boolean;
  },
): Prisma.CsgoPlayerSkinUncheckedCreateInput {
  const equippedT = team === "T";
  const equippedCT = team === "CT";
  return {
    steamId: base.steamId,
    skinId: base.skinId,
    wear: base.wear,
    seed: base.seed,
    stattrak: base.stattrak,
    equipped: true,
    equippedT,
    equippedCT,
  };
}

export function buildTeamEquipUpdateData(
  team: LoadoutTeam,
  current: { equippedT: boolean; equippedCT: boolean },
): Prisma.CsgoPlayerSkinUpdateInput {
  const equippedT = team === "T" ? true : current.equippedT;
  const equippedCT = team === "CT" ? true : current.equippedCT;
  return {
    equipped: mergeEquippedFlags(equippedT, equippedCT),
    equippedT,
    equippedCT,
  };
}
