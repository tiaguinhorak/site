"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { StickerImage } from "@/components/inventory/sticker-image";
import { useWeaponStickerLimits } from "@/components/inventory/use-weapon-sticker-limits";
import { isStickerSlotPlanLocked } from "@/lib/inventory/weapon-sticker-slot-limits";
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
  size?: "sm" | "md" | "lg";
  layout?: "stack" | "grid";
  showClear?: boolean;
  showHint?: boolean;
};

const SIZE_CONFIG = {
  sm: {
    slot: "h-10 w-10",
    image: "h-8 w-8",
    gap: "gap-1.5",
    emptyNum: "text-[10px]",
  },
  md: {
    slot: "h-12 w-12 sm:h-14 sm:w-14",
    image: "h-10 w-10 sm:h-12 sm:w-12",
    gap: "gap-2 sm:gap-2.5",
    emptyNum: "text-xs",
  },
  lg: {
    slot: "h-16 w-16",
    image: "h-14 w-14",
    gap: "gap-3",
    emptyNum: "text-sm",
  },
} as const;

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
  layout = "stack",
  showClear = false,
  showHint = false,
}: WeaponStickerSlotGridProps) {
  const t = useTranslations("inventory");
  const { limits, isSlotEditable } = useWeaponStickerLimits(weaponId, planMax);
  const cfg = SIZE_CONFIG[size];

  if (!limits.supportsStickers || limits.weaponMaxSlots <= 0) {
    return (
      <p className="text-sm text-muted">{t("stickersWeaponUnsupported")}</p>
    );
  }

  const slotCount = limits.weaponMaxSlots;

  function renderSlotButton(index: number) {
    const filled = slots[index] > 0;
    const active = activeSlot === index;
    const planLocked = isStickerSlotPlanLocked(index, limits);
    const editable = isSlotEditable(index);
    const slotLabel = slotLabels[index];
    const slotImage = slotImageUrls[index];

    return (
      <div key={index} className="relative shrink-0">
        <button
          type="button"
          disabled={planLocked}
          onClick={() => {
            if (editable) onSelectSlot(index);
          }}
          title={
            planLocked
              ? t("stickersSlotPlanLocked", { slot: index + 1 })
              : t("stickersSlotPicker", { slot: index + 1 })
          }
          className={cn(
            "relative flex items-center justify-center rounded-xl border-2 transition-all",
            cfg.slot,
            surfaceSubtleClass,
            planLocked && "cursor-not-allowed opacity-70",
            !planLocked && active
              ? "border-primary ring-2 ring-primary/45 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]"
              : !planLocked && filled
                ? "border-primary/30 hover:border-primary/50"
                : !planLocked
                  ? "border-dashed border-border/50 hover:border-primary/35"
                  : "border-dashed border-border/40",
          )}
          aria-label={
            planLocked
              ? t("stickersSlotPlanLocked", { slot: index + 1 })
              : t("stickersSlotPicker", { slot: index + 1 })
          }
          aria-pressed={active}
        >
          {filled && slotImage && !planLocked ? (
            <StickerImage
              src={slotImage}
              alt={slotLabel || ""}
              className={cn("object-contain", cfg.image)}
            />
          ) : filled && !planLocked ? (
            <span className="px-1 text-center text-[9px] font-semibold leading-tight">
              {slotLabel || `#${slots[index]}`}
            </span>
          ) : (
            <span className={cn("font-bold text-muted/45", cfg.emptyNum)}>
              {index + 1}
            </span>
          )}
          {planLocked && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/55"
              aria-hidden
            >
              <Lock className="h-4 w-4 text-foreground/90" />
            </div>
          )}
        </button>
        {showClear && filled && editable && onClearSlot && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearSlot(index);
            }}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background shadow-sm hover:bg-destructive"
            aria-label={t("stickersClear")}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  const rowClass = cn(
    "flex items-center justify-center",
    cfg.gap,
    layout === "grid" ? "flex-wrap" : "flex-row",
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      {showHint && (
        <p className="text-[9px] font-medium uppercase tracking-wider text-muted/80">
          {t("stickersSlotStackHint")}
        </p>
      )}
      <div className={rowClass}>
        {Array.from({ length: slotCount }).map((_, index) => renderSlotButton(index))}
      </div>
      {limits.effectiveMaxSlots < limits.weaponMaxSlots && (
        <p className="text-[10px] text-muted">
          {t("stickersWeaponSlotHint", { max: limits.weaponMaxSlots })}
        </p>
      )}
    </div>
  );
}
