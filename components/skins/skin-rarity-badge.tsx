"use client";

import { cn } from "@/lib/utils";
import {
  accentForRarity,
  RARITY_TIER_I18N_KEY,
  rarityKeyFromLabel,
} from "@/lib/inventory/rarity-tiers";
import { useInventoryRarityText } from "@/lib/inventory/use-inventory-rarity-text";

type SkinRarityBadgeProps = {
  rarity: string;
  accent?: string;
  className?: string;
  size?: "sm" | "md";
};

export function SkinRarityBadge({
  rarity,
  accent,
  className,
  size = "sm",
}: SkinRarityBadgeProps) {
  const rarityText = useInventoryRarityText();
  const key = rarityKeyFromLabel(rarity);
  const gradient = accent ?? accentForRarity(rarity);
  const label = rarityText(RARITY_TIER_I18N_KEY[key]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full ring-1 ring-white/10",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full bg-linear-to-br", gradient)}
        aria-hidden
      />
      <span className="font-semibold uppercase tracking-wider text-muted">{label}</span>
    </span>
  );
}
