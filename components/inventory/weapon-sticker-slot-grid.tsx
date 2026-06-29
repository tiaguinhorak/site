"use client";

import { useTranslations } from "next-intl";
import type { InventoryCategoryKey } from "@/lib/profile";
import { StickerImage } from "@/components/inventory/sticker-image";
import { useWeaponStickerLimits } from "@/components/inventory/use-weapon-sticker-limits";
import {
  stickerSlotPositionKeys,
  type StickerSlotPositionKey,
} from "@/lib/inventory/weapon-sticker-slot-labels";
import { cn } from "@/lib/utils";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";

type WeaponStickerSlotGridProps = {
  weaponId: string;
  planMax: number;
  categoryKey?: InventoryCategoryKey;
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
    label: "text-[8px]",
  },
  md: {
    slot: "h-12 w-12 sm:h-14 sm:w-14",
    image: "h-10 w-10 sm:h-12 sm:w-12",
    gap: "gap-2 sm:gap-2.5",
    emptyNum: "text-xs",
    label: "text-[9px]",
  },
  lg: {
    slot: "h-16 w-16",
    image: "h-14 w-14",
    gap: "gap-3",
    emptyNum: "text-sm",
    label: "text-[10px]",
  },
} as const;

const POSITION_I18N: Record<StickerSlotPositionKey, string> = {
  stock: "stickersSlotPositionStock",
  body: "stickersSlotPositionBody",
  scope: "stickersSlotPositionScope",
  barrel: "stickersSlotPositionBarrel",
  slide: "stickersSlotPositionSlide",
  grip: "stickersSlotPositionGrip",
  magazine: "stickersSlotPositionMagazine",
  receiver: "stickersSlotPositionReceiver",
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
  layout = "stack",
  showClear = false,
  showHint = false,
  categoryKey,
}: WeaponStickerSlotGridProps) {
  const t = useTranslations("inventory");
  const { limits, isSlotEditable } = useWeaponStickerLimits(weaponId, planMax, categoryKey);
  const cfg = SIZE_CONFIG[size];

  if (!limits.supportsStickers || limits.weaponMaxSlots <= 0) {
    return (
      <p className="text-sm text-muted">{t("stickersWeaponUnsupported")}</p>
    );
  }

  const slotCount = limits.effectiveMaxSlots;
  if (slotCount <= 0) {
    return (
      <p className="text-sm text-muted">{t("stickersPlanRequired")}</p>
    );
  }

  const positionKeys = stickerSlotPositionKeys(weaponId, limits.weaponMaxSlots);

  function positionLabel(index: number): string {
    const key = positionKeys[index];
    if (!key) return t("stickersSlotPicker", { slot: index + 1 });
    return t(POSITION_I18N[key]);
  }

  function renderSlotButton(index: number) {
    const filled = slots[index] > 0;
    const active = activeSlot === index;
    const editable = isSlotEditable(index);
    const slotLabel = slotLabels[index];
    const slotImage = slotImageUrls[index];
    const positionName = positionLabel(index);

    return (
      <div key={index} className="flex flex-col items-center gap-0.5 shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (editable) onSelectSlot(index);
            }}
            title={t("stickersSlotPickerWithPosition", {
              slot: index + 1,
              position: positionName,
            })}
            className={cn(
              "relative flex items-center justify-center rounded-xl border-2 transition-all",
              cfg.slot,
              surfaceSubtleClass,
              active
                ? "border-primary ring-2 ring-primary/45 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_25%,transparent)]"
                : filled
                  ? "border-primary/30 hover:border-primary/50"
                  : "border-dashed border-border/50 hover:border-primary/35",
            )}
            aria-label={t("stickersSlotPickerWithPosition", {
              slot: index + 1,
              position: positionName,
            })}
            aria-pressed={active}
          >
            {filled && slotImage ? (
              <StickerImage
                src={slotImage}
                alt={slotLabel || positionName}
                className={cn("object-contain", cfg.image)}
              />
            ) : filled ? (
              <span className="px-1 text-center text-[9px] font-semibold leading-tight">
                {slotLabel || `#${slots[index]}`}
              </span>
            ) : (
              <span className={cn("font-bold text-muted/45", cfg.emptyNum)}>
                {index + 1}
              </span>
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
        <span className={cn("max-w-[4.5rem] text-center font-medium text-muted/80", cfg.label)}>
          {positionName}
        </span>
      </div>
    );
  }

  const rowClass = cn(
    "flex items-start justify-center",
    cfg.gap,
    layout === "grid" ? "flex-wrap" : "flex-row",
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      {showHint && (
        <p className="text-[9px] font-medium uppercase tracking-wider text-muted/80">
          {t("stickersSlotStackHintDynamic", { count: slotCount, max: limits.weaponMaxSlots })}
        </p>
      )}
      <div className={rowClass}>
        {Array.from({ length: slotCount }).map((_, index) => renderSlotButton(index))}
      </div>
      {limits.effectiveMaxSlots < limits.weaponMaxSlots && (
        <p className="text-[10px] text-muted">
          {t("stickersPlanSlotHint", {
            plan: limits.effectiveMaxSlots,
            max: limits.weaponMaxSlots,
          })}
        </p>
      )}
    </div>
  );
}
