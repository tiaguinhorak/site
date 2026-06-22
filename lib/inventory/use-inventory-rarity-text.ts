"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { RARITY_I18N_FALLBACK } from "@/lib/inventory/rarity-tiers";

/** Resolves inventory rarity strings with static fallbacks (avoids dev crashes on stale message bundles). */
export function useInventoryRarityText() {
  const t = useTranslations("inventory");

  return useCallback(
    (key: string) => {
      const fallback = RARITY_I18N_FALLBACK[key];
      if (fallback && !t.has(key)) return fallback;
      return t(key);
    },
    [t],
  );
}
