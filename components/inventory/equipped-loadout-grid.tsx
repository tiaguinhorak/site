"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventorySkinTile } from "@/components/inventory/inventory-skin-tile";
import { LoadoutStickerStrip } from "@/components/inventory/loadout-sticker-strip";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import { mapCatalogCategoryToUi } from "@/lib/inventory/catalog-categories";
import { skinSupportsStickers } from "@/lib/inventory/weapon-sticker-support";
import type { InventoryCategoryKey } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { surfaceSubtleClass, textWarningClass } from "@/lib/ui/theme-surfaces";

export type EquippedLoadoutEntry = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  category?: InventoryCategoryKey;
  imageUrl: string | null;
  accent: string;
  rarity: string;
  equippedT: boolean;
  equippedCT: boolean;
  stickersT: Array<{ slot: number; defIndex: number; name: string; imageUrl: string | null }>;
  stickersCT: Array<{ slot: number; defIndex: number; name: string; imageUrl: string | null }>;
};

type EquippedLoadoutGridProps = {
  title: string;
  count: number;
  steamLinked: boolean;
  steamId: string | null;
  steamId2?: string | null;
  items: EquippedLoadoutEntry[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (item: EquippedLoadoutEntry, tab?: "skins" | "stickers", stickerTeam?: "T" | "CT") => void;
};

export function EquippedLoadoutGrid({
  title,
  count,
  steamLinked,
  steamId,
  steamId2,
  items,
  refreshing,
  onRefresh,
  onOpen,
}: EquippedLoadoutGridProps) {
  const t = useTranslations("inventory");

  return (
    <div className="rounded-card glass-strong p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t("itemsCount", { count })}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          aria-label={t("retry")}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "motion-safe-spin")} />
        </Button>
      </div>

      {!steamLinked ? (
        <p className={cn("text-xs leading-relaxed", textWarningClass)}>
          {t("loadoutSteamRequired")}
        </p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("loadoutEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => {
            const supportsStickers = skinSupportsStickers(
              item.weaponId,
              4,
              item.category ?? mapCatalogCategoryToUi(undefined, item.weaponId),
            );

            return (
              <InventorySkinTile
                key={item.catalogSkinId}
                name={item.name}
                imageUrl={item.imageUrl}
                accent={item.accent}
                rarity={item.rarity}
                equippedT={item.equippedT}
                equippedCT={item.equippedCT}
                onClick={() => onOpen(item, "skins")}
                className={cn(surfaceSubtleClass, "border-border/50")}
              >
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                  <SkinRarityBadge rarity={item.rarity} accent={item.accent} />
                </div>
                {supportsStickers && (
                  <div className="mt-2 space-y-1">
                    {item.equippedT && (
                      <LoadoutStickerStrip
                        stickers={item.stickersT}
                        team="T"
                        label="TR"
                        onClick={() => onOpen(item, "stickers", "T")}
                      />
                    )}
                    {item.equippedCT && (
                      <LoadoutStickerStrip
                        stickers={item.stickersCT}
                        team="CT"
                        label="CT"
                        onClick={() => onOpen(item, "stickers", "CT")}
                      />
                    )}
                  </div>
                )}
              </InventorySkinTile>
            );
          })}
        </div>
      )}

      {steamLinked && (
        <p className="mt-4 text-[10px] leading-relaxed text-muted">
          {steamId2
            ? t("loadoutSteamId2", { steamId: steamId2 })
            : t("loadoutSteamId", { steamId: steamId ?? "" })}
        </p>
      )}
    </div>
  );
}
