export type LoadoutTeam = "T" | "CT";

/**
 * Weapons only available to Terrorists in the buy menu — cannot equip skins on CT.
 * Shared weapons (AWP, Deagle, Nova, etc.) are intentionally omitted.
 */
const T_ONLY_WEAPON_IDS = new Set([
  "weapon_glock",
  "weapon_tec9",
  "weapon_galilar",
  "weapon_ak47",
  "weapon_g3sg1",
  "weapon_mac10",
  "weapon_sawedoff",
]);

/** Weapons only available to Counter-Terrorists in the buy menu — cannot equip on T. */
const CT_ONLY_WEAPON_IDS = new Set([
  "weapon_hkp2000",
  "weapon_usp_silencer",
  "weapon_fiveseven",
  "weapon_cz75a",
  "weapon_famas",
  "weapon_m4a1",
  "weapon_m4a1_silencer",
  "weapon_aug",
  "weapon_sg556",
  "weapon_scar20",
  "weapon_mp9",
  "weapon_mag7",
]);

export function normalizeWeaponId(weaponId: string): string {
  return weaponId.trim().toLowerCase();
}

export function weaponAllowedOnTeam(weaponId: string, team: LoadoutTeam): boolean {
  const id = normalizeWeaponId(weaponId);
  if (T_ONLY_WEAPON_IDS.has(id)) return team === "T";
  if (CT_ONLY_WEAPON_IDS.has(id)) return team === "CT";
  return true;
}

export function teamEquipField(team: LoadoutTeam): "equippedT" | "equippedCT" {
  return team === "T" ? "equippedT" : "equippedCT";
}

export function isEquippedOnTeam(
  row: { equippedT: boolean; equippedCT: boolean },
  team: LoadoutTeam,
): boolean {
  return team === "T" ? row.equippedT : row.equippedCT;
}

export function mergeEquippedFlags(equippedT: boolean, equippedCT: boolean): boolean {
  return equippedT || equippedCT;
}

export function excludedWeaponIdsForTeam(team: LoadoutTeam): string[] {
  const source = team === "T" ? CT_ONLY_WEAPON_IDS : T_ONLY_WEAPON_IDS;
  return [...source];
}
