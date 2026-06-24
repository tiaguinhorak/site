"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Swords, Hand, Crosshair, Target, Zap, Boxes } from "lucide-react";
import { InventorySkinTile } from "@/components/inventory/inventory-skin-tile";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { SkinRarityLegend } from "@/components/skins/skin-rarity-legend";
import type { InventoryCategoryKey } from "@/lib/profile";
import type { PublicSkinGroup } from "@/lib/inventory/get-public-player-skins";
import { catalogSkinToPreview } from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { cn } from "@/lib/utils";
import { chipInactiveHoverClass } from "@/lib/ui/theme-surfaces";

const CATEGORY_ICON: Record<"all" | InventoryCategoryKey, typeof LayoutGrid> = {
  all: LayoutGrid,
  knife: Swords,
  gloves: Hand,
  rifle: Crosshair,
  pistol: Target,
  smg: Zap,
  agent: Boxes,
};

export function PublicProfileSkins({
  groups,
  total,
}: {
  groups: PublicSkinGroup[];
  total: number;
}) {
  const t = useTranslations("inventory");
  const tp = useTranslations("publicProfile");

  const categoryLabels: Record<InventoryCategoryKey, string> = useMemo(
    () => ({
      knife: t("catKnife"),
      gloves: t("catGloves"),
      rifle: t("catRifle"),
      pistol: t("catPistol"),
      smg: t("catSmg"),
      agent: t("catAgent"),
    }),
    [t],
  );

  const tabs = useMemo(
    () => [
      { id: "all" as const, label: t("catAll"), count: total },
      ...groups.map((g) => ({
        id: g.category,
        label: categoryLabels[g.category],
        count: g.items.length,
      })),
    ],
    [groups, total, t, categoryLabels],
  );

  const [active, setActive] = useState<"all" | InventoryCategoryKey>("all");
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();

  const visibleGroups =
    active === "all" ? groups : groups.filter((g) => g.category === active);

  const flatItems =
    active === "all"
      ? groups.flatMap((g) => g.items.map((item) => ({ item, category: g.category })))
      : visibleGroups.flatMap((g) => g.items.map((item) => ({ item, category: g.category })));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-card glass-strong p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-muted">
          <Boxes className="h-4 w-4 text-primary" />
          {tp("skinsTitle")}
        </h2>
        <span className="text-xs text-muted">{tp("skinsCount", { count: total })}</span>
      </div>

      {total === 0 ? (
        <p className="mt-6 rounded-xl glass p-6 text-center text-sm text-muted">
          {tp("noSkins")}
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = CATEGORY_ICON[tab.id];
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                      : chipInactiveHoverClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)] dark:bg-black/20"
                        : "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] dark:bg-white/10",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <SkinRarityLegend className="mt-5" />

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {flatItems.map(({ item, category }) => (
              <InventorySkinTile
                key={item.id}
                name={item.name}
                imageUrl={item.imageUrl}
                accent={item.accent}
                equippedT={item.equippedT}
                equippedCT={item.equippedCT}
                onClick={() =>
                  openPreview(
                    catalogSkinToPreview({
                      name: item.name,
                      id: item.id,
                      imageUrl: item.imageUrl,
                      accent: item.accent,
                      category: categoryLabels[category],
                      rarity: item.rarity,
                      weaponName: item.weaponName,
                      paintkitName: item.paintkitName,
                      stattrak: item.stattrak,
                    }),
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </motion.div>
  );
}
