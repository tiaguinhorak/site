import "server-only";

import { getCsgoApiIndex } from "@/lib/inventory/csgo-api-index";

const FALLBACK_WEAPON_DEFINDEX: Record<string, number> = {
  weapon_deagle: 1,
  weapon_elite: 2,
  weapon_fiveseven: 3,
  weapon_glock: 4,
  weapon_ak47: 7,
  weapon_aug: 8,
  weapon_awp: 9,
  weapon_famas: 10,
  weapon_g3sg1: 11,
  weapon_galilar: 13,
  weapon_m249: 14,
  weapon_m4a1: 16,
  weapon_mac10: 17,
  weapon_p90: 19,
  weapon_mp5sd: 23,
  weapon_ump45: 24,
  weapon_xm1014: 25,
  weapon_bizon: 26,
  weapon_mag7: 27,
  weapon_negev: 28,
  weapon_sawedoff: 29,
  weapon_tec9: 30,
  weapon_hkp2000: 32,
  weapon_mp7: 33,
  weapon_mp9: 34,
  weapon_nova: 35,
  weapon_p250: 36,
  weapon_scar20: 38,
  weapon_sg556: 39,
  weapon_ssg08: 40,
  weapon_m4a1_silencer: 60,
  weapon_usp_silencer: 61,
  weapon_cz75a: 63,
  weapon_revolver: 64,
  weapon_knife: 42,
};

/** CS item definition index for sticker plugin `weaponindex` column. */
export async function weaponIdToItemDefIndex(weaponId: string): Promise<number | null> {
  const id = weaponId.trim().toLowerCase();
  if (FALLBACK_WEAPON_DEFINDEX[id]) return FALLBACK_WEAPON_DEFINDEX[id];

  if (id.includes("knife") || id.includes("bayonet")) {
    return FALLBACK_WEAPON_DEFINDEX.weapon_knife;
  }

  try {
    const index = await getCsgoApiIndex();
    const skin = index.byWeapon.get(id)?.[0];
    const weaponIdNum = skin?.weapon?.weapon_id;
    if (weaponIdNum !== undefined && Number.isFinite(Number(weaponIdNum))) {
      return Number(weaponIdNum);
    }
  } catch {
    // fallback only
  }

  return FALLBACK_WEAPON_DEFINDEX[id] ?? null;
}
