"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Swords, Hand, Crosshair, Target, Zap, Boxes } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import { SkinPreviewModal } from "@/components/skins/skin-preview-modal";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import { SkinRarityLegend } from "@/components/skins/skin-rarity-legend";
import { SkinRarityLine } from "@/components/skins/skin-rarity-line";
import type { InventoryCategoryKey } from "@/lib/profile";
import type { PublicLoadoutSide, PublicSkinGroup } from "@/lib/inventory/get-public-player-skins";
import { catalogSkinToPreview } from "@/lib/inventory/skin-preview-mappers";
import { useSkinPreview } from "@/lib/use-skin-preview";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceSubtleClass,
  teamLabelClass,
} from "@/lib/ui/theme-surfaces";

const CATEGORY_ICON: Record<"all" | InventoryCategoryKey, typeof LayoutGrid> = {
  all: LayoutGrid,
  knife: Swords,
  gloves: Hand,
  rifle: Crosshair,
  pistol: Target,
  smg: Zap,
  agent: Boxes,
};

function SideSkins({
  side,
  categoryLabels,
}: {
  side: PublicLoadoutSide;
  categoryLabels: Record<InventoryCategoryKey, string>;
}) {
  const t = useTranslations("inventory");
  const tp = useTranslations("publicProfile");

  const tabs = useMemo(
    () => [
      { id: "all" as const, label: t("catAll"), count: side.total },
      ...side.groups.map((g) => ({
        id: g.category,
        label: categoryLabels[g.category],
        count: g.items.length,
      })),
    ],
    [side, t, categoryLabels],
  );

  const [active, setActive] = useState<"all" | InventoryCategoryKey>("all");
  const { previewSkin, openPreview, closePreview, isPreviewOpen } = useSkinPreview();

  const visibleGroups =
    active === "all" ? side.groups : side.groups.filter((g) => g.category === active);

  const teamLabel = side.team === "T" ? t("teamT") : t("teamCT");

  const previewPublicSkin = (
    item: PublicSkinGroup["items"][number],
    category: InventoryCategoryKey,
  ) =>
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
    });

  return (
    <div className={cn("rounded-xl border border-border p-4 sm:p-5", surfaceSubtleClass)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3
          className={cn("text-xs font-bold uppercase tracking-wider", teamLabelClass(side.team))}
        >
          {teamLabel}
        </h3>
        <span className="text-xs text-muted">{tp("skinsCount", { count: side.total })}</span>
      </div>

      <div className="flex flex-wrap gap-2">
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
                  : "glass-input text-muted hover:text-foreground",
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

      <div className="mt-6 space-y-6">
        {visibleGroups.map((group: PublicSkinGroup) => (
          <div key={group.category}>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {categoryLabels[group.category]}
              <span className="text-muted/60">· {group.items.length}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.items.map((item) => (
                <article
                  key={`${side.team}-${item.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(previewPublicSkin(item, group.category))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPreview(previewPublicSkin(item, group.category));
                    }
                  }}
                  className="relative flex flex-col overflow-hidden rounded-xl glass cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <SkinRarityLine accent={item.accent} rarity={item.rarity} />
                  <div className="relative p-3">
                    <InventoryItemArt
                      imageUrl={item.imageUrl}
                      accent={item.accent}
                      className="h-24 w-full"
                    />
                    {item.stattrak && (
                      <span className="absolute left-5 top-5 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                        ST
                      </span>
                    )}
                  </div>
                  <div className="border-t border-white/5 px-3 pb-3">
                    <p className="line-clamp-1 text-xs font-semibold text-foreground">
                      {item.weaponName}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-muted">{item.paintkitName}</p>
                    <SkinRarityBadge
                      rarity={item.rarity}
                      accent={item.accent}
                      className="mt-2"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <SkinPreviewModal open={isPreviewOpen} skin={previewSkin} onClose={closePreview} />
    </div>
  );
}

export function PublicProfileSkins({ sides }: { sides: PublicLoadoutSide[] }) {
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

  const total = useMemo(
    () => sides.reduce((sum, side) => sum + side.total, 0),
    [sides],
  );

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
          <SkinRarityLegend className="mt-5" />
          <div className="mt-6 space-y-6">
            {sides.map((side) => (
              <SideSkins key={side.team} side={side} categoryLabels={categoryLabels} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
