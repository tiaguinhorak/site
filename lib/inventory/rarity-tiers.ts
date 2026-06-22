import { rarityAccent } from "@/lib/inventory/catalog-categories";

export type RarityKey = "mythic" | "legendary" | "epic" | "rare" | "uncommon" | "common";

export const RARITY_TIER_ORDER: RarityKey[] = [
  "mythic",
  "legendary",
  "epic",
  "rare",
  "uncommon",
  "common",
];

export const RARITY_TIER_ACCENTS: Record<RarityKey, string> = {
  mythic: "from-amber-400 to-yellow-600",
  legendary: "from-rose-500 to-red-700",
  epic: "from-violet-500 to-purple-600",
  rare: "from-blue-500 to-indigo-600",
  uncommon: "from-emerald-500 to-teal-600",
  common: "from-slate-500 to-zinc-700",
};

/** Fallback labels when next-intl messages are stale (dev cache / partial bundle). */
export const RARITY_I18N_FALLBACK: Record<string, string> = {
  rarityLegendTitle: "Raridades",
  rarityMythic: "Mítico",
  rarityLegendary: "Lendário",
  rarityEpic: "Épico",
  rarityRare: "Raro",
  rarityUncommon: "Incomum",
  rarityCommon: "Comum",
};

export const RARITY_TIER_I18N_KEY: Record<RarityKey, string> = {
  mythic: "rarityMythic",
  legendary: "rarityLegendary",
  epic: "rarityEpic",
  rare: "rarityRare",
  uncommon: "rarityUncommon",
  common: "rarityCommon",
};

export function rarityKeyFromLabel(rarity: string): RarityKey {
  const value = rarity
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (
    value.includes("mitic") ||
    value.includes("contraband") ||
    value.includes("ancient")
  ) {
    return "mythic";
  }
  if (value.includes("lendario") || value.includes("covert") || value.includes("legendary")) {
    return "legendary";
  }
  if (
    value.includes("epico") ||
    value.includes("classified") ||
    value.includes("mythical")
  ) {
    return "epic";
  }
  if (value.includes("raro") || value.includes("restricted") || value.includes("rare")) {
    return "rare";
  }
  if (value.includes("incomum") || value.includes("uncommon")) {
    return "uncommon";
  }
  return "common";
}

export function accentForRarity(rarity: string): string {
  const key = rarityKeyFromLabel(rarity);
  return RARITY_TIER_ACCENTS[key] ?? rarityAccent(rarity);
}
