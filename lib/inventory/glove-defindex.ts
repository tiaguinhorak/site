/** Glove type defindexes (CSGO-API weapon.weapon_id → kgns t_group / ct_group). */

export const GLOVE_WEAPON_ID_TO_DEFINDEX: Record<string, number> = {
  studded_bloodhound_gloves: 5027,
  sporty_gloves: 5030,
  slick_gloves: 5031,
  leather_handwraps: 5032,
  motorcycle_gloves: 5033,
  specialist_gloves: 5034,
  studded_hydra_gloves: 5035,
  studded_brokenfang_gloves: 4725,
};

export function normalizeGloveWeaponId(weaponId: string): string {
  let id = weaponId.trim().toLowerCase();
  if (id.startsWith("weapon_")) {
    id = id.slice("weapon_".length);
  }
  return id;
}

export function isGlovesWeaponId(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  return id.includes("gloves") || id.includes("handwraps");
}

export function resolveGloveDefIndex(
  weaponId: string,
  defIndex?: number | null,
): number | null {
  if (defIndex != null && defIndex > 0) {
    if (defIndex >= 4000 || defIndex === 4725) return defIndex;
  }

  const normalized = normalizeGloveWeaponId(weaponId);
  return (
    GLOVE_WEAPON_ID_TO_DEFINDEX[normalized] ??
    GLOVE_WEAPON_ID_TO_DEFINDEX[weaponId] ??
    null
  );
}
