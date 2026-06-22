import type { InventoryCategoryKey } from "@/lib/profile";

/** CSGO-API category ids (legacy sfui_* and new csgo_inventory_weapon_category_*). */
const WEAPON_CATEGORY_IDS = new Set([
  "sfui_invpanel_filter_melee",
  "sfui_invpanel_filter_rifles",
  "sfui_invpanel_filter_pistols",
  "sfui_invpanel_filter_smgs",
  "sfui_invpanel_filter_heavy",
  "sfui_invpanel_filter_gloves",
  "csgo_inventory_weapon_category_rifles",
  "csgo_inventory_weapon_category_pistols",
  "csgo_inventory_weapon_category_smgs",
  "csgo_inventory_weapon_category_heavy",
  "csgo_inventory_weapon_category_gloves",
]);

const PISTOL_WEAPON_IDS = new Set([
  "weapon_deagle",
  "weapon_usp_silencer",
  "weapon_hkp2000",
  "weapon_glock",
  "weapon_elite",
  "weapon_p250",
  "weapon_cz75a",
  "weapon_fiveseven",
  "weapon_tec9",
  "weapon_revolver",
]);

const SMG_WEAPON_IDS = new Set([
  "weapon_mp9",
  "weapon_mac10",
  "weapon_mp7",
  "weapon_ump45",
  "weapon_p90",
  "weapon_bizon",
  "weapon_mp5sd",
]);

export function isWeaponSkinCategory(categoryId: string | undefined): boolean {
  if (!categoryId) return false;
  return WEAPON_CATEGORY_IDS.has(categoryId);
}

function inferCategoryFromWeaponId(weaponId: string): InventoryCategoryKey {
  const id = weaponId.toLowerCase();
  if (id.includes("gloves") || id.includes("handwraps")) return "gloves";
  if (id.includes("knife") || id.includes("bayonet")) return "knife";
  if (PISTOL_WEAPON_IDS.has(id)) return "pistol";
  if (SMG_WEAPON_IDS.has(id)) return "smg";
  return "rifle";
}

export function mapCatalogCategoryToUi(
  categoryId: string | undefined,
  weaponId: string,
): InventoryCategoryKey {
  const id = categoryId ?? "";

  if (id.includes("gloves") || weaponId.includes("gloves") || weaponId.includes("handwraps")) {
    return "gloves";
  }
  if (
    id.includes("melee") ||
    weaponId.includes("knife") ||
    weaponId === "weapon_knife" ||
    weaponId.includes("bayonet")
  ) {
    return "knife";
  }
  if (id.includes("pistol")) return "pistol";
  if (id.includes("smg")) return "smg";
  if (id.includes("rifle") || id.includes("heavy") || id.includes("sniper")) return "rifle";

  return inferCategoryFromWeaponId(weaponId);
}

export function rarityAccent(rarity: string): string {
  const value = rarity.toLowerCase();
  if (value.includes("contraband") || value.includes("ancient")) {
    return "from-amber-400 to-yellow-600";
  }
  if (value.includes("covert") || value.includes("legendary")) {
    return "from-rose-500 to-red-700";
  }
  if (value.includes("classified") || value.includes("mythical")) {
    return "from-violet-500 to-purple-600";
  }
  if (value.includes("restricted") || value.includes("rare")) {
    return "from-blue-500 to-indigo-600";
  }
  if (value.includes("uncommon")) {
    return "from-emerald-500 to-teal-600";
  }
  return "from-slate-500 to-zinc-700";
}

export function rarityLabelFromId(rarityId: string): string {
  const map: Record<string, string> = {
    rarity_ancient_weapon: "mítico",
    rarity_legendary_weapon: "lendário",
    rarity_mythical_weapon: "épico",
    rarity_rare_weapon: "raro",
    rarity_uncommon_weapon: "comum",
    rarity_common_weapon: "comum",
    rarity_contraband: "mítico",
  };
  return map[rarityId] ?? rarityId.replace(/^rarity_/, "").replace(/_/g, " ");
}
