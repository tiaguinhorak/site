import type { CsgoPlayerSkin, CsgoSkinCatalog, CsgoSkinWear } from "@/lib/generated/prisma/client";
import { WEAR_FLOAT } from "@/lib/csgo-api/serializers";
import {
  isGlovesWeaponId,
  resolveGloveDefIndex,
} from "@/lib/inventory/glove-defindex";
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

/** True when row is equipped on this side (or legacy `equipped` without per-team flags). */
function isEquippedOnTeam(row: EquippedRow, team: LoadoutTeam): boolean {
  if (team === "T" && row.equippedT) return true;
  if (team === "CT" && row.equippedCT) return true;
  // Legacy rows before migration / re-equip: `equipped` only → sync both sides
  if (row.equipped && !row.equippedT && !row.equippedCT) return true;
  return false;
}

function mapRowToSyncWeapon(row: EquippedRow, team?: LoadoutTeam): SyncWeaponEntry {
  const defIndex =
    isGlovesWeaponId(row.skin.weaponId)
      ? resolveGloveDefIndex(row.skin.weaponId, row.skin.weaponDefIndex)
      : row.skin.weaponDefIndex;

  return {
    weaponId: row.skin.weaponId,
    paintkit: row.skin.paintkit,
    wear: parseFloat(WEAR_FLOAT[row.wear as CsgoSkinWear] ?? "0.15"),
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
    if (row.equippedT || row.equippedCT || row.equipped) {
      weaponIds.add(row.skin.weaponId);
    }
  }

  for (const weaponId of weaponIds) {
    const tRow = rows.find((r) => r.skin.weaponId === weaponId && isEquippedOnTeam(r, "T"));
    const ctRow = rows.find((r) => r.skin.weaponId === weaponId && isEquippedOnTeam(r, "CT"));
    if (tRow) {
      weapons.push(mapRowToSyncWeapon(tRow, "T"));
    }
    if (ctRow) {
      weapons.push(mapRowToSyncWeapon(ctRow, "CT"));
    }
  }

  return weapons;
}
