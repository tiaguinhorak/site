import type { CsgoPlayerSkin, CsgoSkinCatalog } from "@/lib/generated/prisma/client";
import {
  isGlovesWeaponId,
  resolveGloveDefIndex,
} from "@/lib/inventory/glove-defindex";
import { clampSkinFloat, SYNC_SKIN_FLOAT_FACTORY_NEW } from "@/lib/inventory/skin-wear";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

export type SyncWeaponEntry = {
  weaponId: string;
  paintkit: number;
  wear: number;
  seed: number;
  stattrak: boolean;
  stattrakCount: number;
  nametag: string | null;
  defIndex?: number;
  team?: LoadoutTeam;
};

type EquippedRow = CsgoPlayerSkin & { skin: CsgoSkinCatalog };

/** True when row is equipped on this side (per-team flags only — no legacy `equipped`). */
function isEquippedOnTeam(row: EquippedRow, team: LoadoutTeam): boolean {
  return team === "T" ? row.equippedT : row.equippedCT;
}

function mapRowToSyncWeapon(row: EquippedRow, team?: LoadoutTeam): SyncWeaponEntry {
  const defIndex =
    isGlovesWeaponId(row.skin.weaponId)
      ? resolveGloveDefIndex(row.skin.weaponId, row.skin.weaponDefIndex)
      : row.skin.weaponDefIndex;

  const rawFloat = clampSkinFloat(row.floatValue);
  const wear =
    rawFloat <= 0 ? SYNC_SKIN_FLOAT_FACTORY_NEW : rawFloat;

  return {
    weaponId: row.skin.weaponId,
    paintkit: row.skin.paintkit,
    wear,
    seed: row.seed,
    stattrak: row.stattrak,
    stattrakCount: row.stattrakCount,
    nametag: row.nametag,
    defIndex: defIndex ?? undefined,
    team,
  };
}

/** Build api-csgo sync payload from equipped player skins (per-side gloves, shared weapon columns). */
export function buildSyncWeaponsFromEquipped(rows: EquippedRow[]): SyncWeaponEntry[] {
  const weapons: SyncWeaponEntry[] = [];

  for (const team of ["T", "CT"] as const) {
    const gloveRow = rows.find(
      (r) =>
        isGlovesWeaponId(r.skin.weaponId) &&
        r.skin.paintkit > 0 &&
        isEquippedOnTeam(r, team),
    );
    if (gloveRow) {
      weapons.push(mapRowToSyncWeapon(gloveRow, team));
    }
  }

  const weaponIds = new Set<string>();
  for (const row of rows) {
    if (isGlovesWeaponId(row.skin.weaponId)) continue;
    if (row.skin.paintkit <= 0) continue;
    if (row.equippedT || row.equippedCT) {
      weaponIds.add(row.skin.weaponId);
    }
  }

  for (const weaponId of weaponIds) {
    const tRow = rows.find((r) => r.skin.weaponId === weaponId && r.equippedT);
    const ctRow = rows.find((r) => r.skin.weaponId === weaponId && r.equippedCT);
    if (tRow) {
      weapons.push(mapRowToSyncWeapon(tRow, "T"));
    }
    if (ctRow) {
      weapons.push(mapRowToSyncWeapon(ctRow, "CT"));
    }
  }

  return weapons;
}
