"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Swords, Hand, Crosshair, Target, Zap, Boxes } from "lucide-react";
import { InventoryItemArt } from "@/components/dashboard/inventory-item-art";
import type { InventoryCategoryKey } from "@/lib/profile";
import type { PublicSkinGroup } from "@/lib/inventory/get-public-player-skins";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<"all" | InventoryCategoryKey, typeof LayoutGrid> = {
  all: LayoutGrid,
  knife: Swords,
  gloves: Hand,
  rifle: Crosshair,
  pistol: Target,
  smg: Zap,
  agent: Boxes,
};

export function PublicProfileSkins({ groups }: { groups: PublicSkinGroup[] }) {
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
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
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

  const visibleGroups = active === "all" ? groups : groups.filter((g) => g.category === active);

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
                      : "glass-input text-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      isActive ? "bg-black/20" : "bg-white/10",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-6">
            {visibleGroups.map((group) => (
              <div key={group.category}>
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  {categoryLabels[group.category]}
                  <span className="text-muted/60">· {group.items.length}</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className="relative flex flex-col overflow-hidden rounded-xl glass p-3"
                    >
                      <div className="relative">
                        <InventoryItemArt
                          imageUrl={item.imageUrl}
                          accent={item.accent}
                          className="h-24 w-full"
                        />
                        <span
                          className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-linear-to-r",
                            item.accent,
                          )}
                          aria-hidden
                        />
                        {item.stattrak && (
                          <span className="absolute left-2 top-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                            ST
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-1 text-xs font-semibold text-foreground">
                        {item.weaponName}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted">{item.paintkitName}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
