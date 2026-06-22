"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  accentForRarity,
  rarityKeyFromLabel,
  type RarityKey,
} from "@/lib/inventory/rarity-tiers";

type SkinRarityBadgeProps = {
  rarity: string;
  accent?: string;
  className?: string;
  size?: "sm" | "md";
};

const LABEL_KEY: Record<RarityKey, string> = {
  mythic: "rarityMythic",
  legendary: "rarityLegendary",
  epic: "rarityEpic",
  rare: "rarityRare",
  uncommon: "rarityUncommon",
  common: "rarityCommon",
};

export function SkinRarityBadge({
  rarity,
  accent,
  className,
  size = "sm",
}: SkinRarityBadgeProps) {
  const t = useTranslations("inventory");
  const key = rarityKeyFromLabel(rarity);
  const gradient = accent ?? accentForRarity(rarity);
  const label = t(LABEL_KEY[key]);

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
