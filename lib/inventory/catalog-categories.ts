import type { InventoryCategoryKey } from "@/lib/profile";

const WEAPON_CATEGORY_IDS = new Set([
  "sfui_invpanel_filter_melee",
  "sfui_invpanel_filter_rifles",
  "sfui_invpanel_filter_pistols",
  "sfui_invpanel_filter_smgs",
  "sfui_invpanel_filter_heavy",
  "sfui_invpanel_filter_gloves",
]);

export function isWeaponSkinCategory(categoryId: string | undefined): boolean {
  if (!categoryId) return false;
  return WEAPON_CATEGORY_IDS.has(categoryId);
}

export function mapCatalogCategoryToUi(
  categoryId: string | undefined,
  weaponId: string,
): InventoryCategoryKey {
  const id = categoryId ?? "";
  if (id.includes("gloves") || weaponId.includes("gloves") || weaponId.includes("handwraps")) {
    return "gloves";
  }
  if (id.includes("melee") || weaponId.includes("knife") || weaponId === "weapon_knife") {
    return "knife";
  }
  if (id.includes("pistol")) return "pistol";
  if (id.includes("smg")) return "smg";
  if (id.includes("rifle") || id.includes("heavy") || id.includes("sniper")) return "rifle";
  return "rifle";
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
