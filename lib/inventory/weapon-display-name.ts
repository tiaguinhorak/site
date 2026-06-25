/** Human-readable weapon names for sticker compatibility UI. */
const WEAPON_DISPLAY_NAMES: Record<string, string> = {
  weapon_deagle: "Desert Eagle",
  weapon_elite: "Dual Berettas",
  weapon_fiveseven: "Five-SeveN",
  weapon_glock: "Glock-18",
  weapon_ak47: "AK-47",
  weapon_aug: "AUG",
  weapon_awp: "AWP",
  weapon_famas: "FAMAS",
  weapon_g3sg1: "G3SG1",
  weapon_galilar: "Galil AR",
  weapon_m249: "M249",
  weapon_m4a1: "M4A4",
  weapon_mac10: "MAC-10",
  weapon_p90: "P90",
  weapon_mp5sd: "MP5-SD",
  weapon_ump45: "UMP-45",
  weapon_xm1014: "XM1014",
  weapon_bizon: "PP-Bizon",
  weapon_mag7: "MAG-7",
  weapon_negev: "Negev",
  weapon_sawedoff: "Sawed-Off",
  weapon_tec9: "Tec-9",
  weapon_hkp2000: "P2000",
  weapon_mp7: "MP7",
  weapon_mp9: "MP9",
  weapon_nova: "Nova",
  weapon_p250: "P250",
  weapon_scar20: "SCAR-20",
  weapon_sg556: "SG 553",
  weapon_ssg08: "SSG 08",
  weapon_m4a1_silencer: "M4A1-S",
  weapon_usp_silencer: "USP-S",
  weapon_cz75a: "CZ75-Auto",
  weapon_revolver: "R8 Revolver",
};

export function weaponIdToDisplayName(weaponId: string): string {
  const id = weaponId.trim().toLowerCase();
  if (WEAPON_DISPLAY_NAMES[id]) return WEAPON_DISPLAY_NAMES[id];

  const stripped = id.replace(/^weapon_/, "").replace(/_/g, " ");
  if (!stripped) return weaponId;
  return stripped
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
