import {
  effectiveMaxStickerSlots,
  maxStickerSlotsForWeaponDefIndex,
  weaponSupportsStickersById,
} from "@/lib/inventory/weapon-sticker-slot-limits";
import { clientWeaponIdToDefIndex } from "@/lib/inventory/weapon-defindex-client";

export type WeaponStickerClass =
  | "pistol"
  | "rifle"
  | "smg"
  | "shotgun"
  | "sniper"
  | "heavy"
  | "melee"
  | "other";

const PISTOL_IDS = new Set([
  "weapon_deagle",
  "weapon_elite",
  "weapon_fiveseven",
  "weapon_glock",
  "weapon_hkp2000",
  "weapon_p250",
  "weapon_tec9",
  "weapon_cz75a",
  "weapon_revolver",
  "weapon_usp_silencer",
]);

const RIFLE_IDS = new Set([
  "weapon_ak47",
  "weapon_aug",
  "weapon_famas",
  "weapon_galilar",
  "weapon_m4a1",
  "weapon_m4a1_silencer",
  "weapon_sg556",
]);

const SMG_IDS = new Set([
  "weapon_mac10",
  "weapon_mp5sd",
  "weapon_mp7",
  "weapon_mp9",
  "weapon_p90",
  "weapon_bizon",
  "weapon_ump45",
]);

const SHOTGUN_IDS = new Set([
  "weapon_mag7",
  "weapon_nova",
  "weapon_sawedoff",
  "weapon_xm1014",
]);

const SNIPER_IDS = new Set(["weapon_awp", "weapon_g3sg1", "weapon_scar20", "weapon_ssg08"]);

const HEAVY_IDS = new Set(["weapon_m249", "weapon_negev"]);

export type WeaponStickerProfile = {
  weaponId: string;
  weaponClass: WeaponStickerClass;
  supportsStickers: boolean;
  weaponMaxSlots: number;
  effectiveMaxSlots: number;
};

export function getWeaponStickerClass(weaponId: string): WeaponStickerClass {
  const id = weaponId.trim().toLowerCase();
  if (id.includes("knife") || id.includes("bayonet")) return "melee";
  if (PISTOL_IDS.has(id)) return "pistol";
  if (RIFLE_IDS.has(id)) return "rifle";
  if (SMG_IDS.has(id)) return "smg";
  if (SHOTGUN_IDS.has(id)) return "shotgun";
  if (SNIPER_IDS.has(id)) return "sniper";
  if (HEAVY_IDS.has(id)) return "heavy";
  return "other";
}

/** Per-weapon sticker capability (slots + class) for picker compatibility checks. */
export function getWeaponStickerProfile(
  weaponId: string,
  planMax = 4,
): WeaponStickerProfile {
  const normalized = weaponId.trim().toLowerCase();
  const defIndex = clientWeaponIdToDefIndex(normalized);
  const weaponMaxSlots = maxStickerSlotsForWeaponDefIndex(defIndex, normalized);
  const supportsStickers = weaponSupportsStickersById(normalized) && weaponMaxSlots > 0;
  const effectiveMax = supportsStickers
    ? effectiveMaxStickerSlots(normalized, planMax, defIndex)
    : 0;

  return {
    weaponId: normalized,
    weaponClass: getWeaponStickerClass(normalized),
    supportsStickers,
    weaponMaxSlots,
    effectiveMaxSlots: effectiveMax,
  };
}
