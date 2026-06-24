import type { RarityKey } from "@/lib/inventory/rarity-tiers";
import { rarityKeyFromLabel } from "@/lib/inventory/rarity-tiers";

const TIER_PATTERNS: Record<RarityKey, string[]> = {
  mythic: ["mitic", "ancient", "contraband"],
  legendary: ["lendario", "covert", "legendary"],
  epic: ["epico", "classified", "mythical"],
  rare: ["raro", "restricted", "rare"],
  uncommon: ["incomum", "uncommon"],
  common: ["comum", "common"],
};

export function rarityMatchesTier(rarity: string, tier: RarityKey): boolean {
  return rarityKeyFromLabel(rarity) === tier;
}

export function prismaRarityTierWhere(tier: RarityKey) {
  const patterns = TIER_PATTERNS[tier];
  return {
    OR: patterns.map((pattern) => ({
      rarity: { contains: pattern, mode: "insensitive" as const },
    })),
  };
}
