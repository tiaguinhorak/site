"use client";

import { useTranslations } from "next-intl";
import { StickerImage } from "@/components/inventory/sticker-image";
import { useWeaponStickerLimits } from "@/components/inventory/use-weapon-sticker-limits";
import { cn } from "@/lib/utils";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";

type WeaponStickerSlotGridProps = {
  weaponId: string;
  planMax: number;
  slots: number[];
  slotLabels: string[];
  slotImageUrls: string[];
  activeSlot: number | null;
  onSelectSlot: (index: number) => void;
  onClearSlot?: (index: number) => void;
  size?: "sm" | "md";
  showClear?: boolean;
};

export function WeaponStickerSlotGrid({
  weaponId,
  planMax,
  slots,
  slotLabels,
  slotImageUrls,
  activeSlot,
  onSelectSlot,
  onClearSlot,
  size = "md",
  showClear = false,
}: WeaponStickerSlotGridProps) {
  const t = useTranslations("inventory");
  const { limits } = useWeaponStickerLimits(weaponId, planMax);

  if (!limits.supportsStickers || limits.visibleSlotCount <= 0) {
    return (
      <p className="text-sm text-muted">{t("stickersWeaponUnsupported")}</p>
    );
  }

  const buttonSize = size === "sm" ? "h-11 w-11" : "h-12 w-12";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Array.from({ length: limits.visibleSlotCount }).map((_, index) => {
        const filled = slots[index] > 0;
        const active = activeSlot === index;
        const slotLabel = slotLabels[index];
        const slotImage = slotImageUrls[index];

        return (
          <div key={index} className="relative">
            <button
              type="button"
              onClick={() => onSelectSlot(index)}
              title={t("stickersSlotPicker", { slot: index + 1 })}
              className={cn(
                "flex items-center justify-center rounded-lg border-2 transition-all",
                buttonSize,
                surfaceSubtleClass,
                active
                  ? "border-primary ring-2 ring-primary/45 scale-105"
                  : filled
                    ? "border-primary/50"
                    : "border-border/40",
              )}
              aria-label={t("stickersSlotPicker", { slot: index + 1 })}
              aria-pressed={active}
            >
              {filled && slotImage ? (
                <StickerImage
                  src={slotImage}
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              ) : filled ? (
                <span className="line-clamp-2 px-0.5 text-center text-[8px] font-semibold leading-tight">
                  {slotLabel || `#${slots[index]}`}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-muted">{index + 1}</span>
              )}
            </button>
            {showClear && filled && onClearSlot && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSlot(index);
                }}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground/90 text-[9px] font-bold text-background shadow-sm hover:bg-destructive"
                aria-label={t("stickersClear")}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
