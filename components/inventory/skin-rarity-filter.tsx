"use client";

import { cn } from "@/lib/utils";
import {
  RARITY_TIER_ACCENTS,
  RARITY_TIER_I18N_KEY,
  RARITY_TIER_ORDER,
  type RarityKey,
} from "@/lib/inventory/rarity-tiers";
import { useInventoryRarityText } from "@/lib/inventory/use-inventory-rarity-text";
import { chipInactiveHoverClass } from "@/lib/ui/theme-surfaces";

export function SkinRarityFilter({
  value,
  onChange,
  availableTiers,
  className,
}: {
  value: RarityKey | "all";
  onChange: (tier: RarityKey | "all") => void;
  availableTiers?: RarityKey[];
  className?: string;
}) {
  const rarityText = useInventoryRarityText();

  const tiers =
    availableTiers && availableTiers.length > 0
      ? RARITY_TIER_ORDER.filter((key) => availableTiers.includes(key))
      : RARITY_TIER_ORDER;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
          value === "all"
            ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
            : chipInactiveHoverClass,
        )}
      >
        {rarityText("catAll")}
      </button>
      {tiers.map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ring-1 transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-foreground ring-primary/40"
                : cn("ring-white/5 text-muted", chipInactiveHoverClass),
            )}
          >
            <span
              className={cn("h-2 w-2 rounded-full bg-linear-to-br", RARITY_TIER_ACCENTS[key])}
              aria-hidden
            />
            {rarityText(RARITY_TIER_I18N_KEY[key])}
          </button>
        );
      })}
    </div>
  );
}
