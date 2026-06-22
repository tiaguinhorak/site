"use client";

import { cn } from "@/lib/utils";
import { RARITY_TIER_ACCENTS, RARITY_TIER_I18N_KEY, RARITY_TIER_ORDER } from "@/lib/inventory/rarity-tiers";
import { useInventoryRarityText } from "@/lib/inventory/use-inventory-rarity-text";

export function SkinRarityLegend({ className }: { className?: string }) {
  const rarityText = useInventoryRarityText();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
        {rarityText("rarityLegendTitle")}
      </span>
      {RARITY_TIER_ORDER.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] ring-1 ring-white/5"
        >
          <span
            className={cn("h-2 w-2 rounded-full bg-linear-to-br", RARITY_TIER_ACCENTS[key])}
            aria-hidden
          />
          <span className="font-medium text-muted">
            {rarityText(RARITY_TIER_I18N_KEY[key])}
          </span>
        </span>
      ))}
    </div>
  );
}
