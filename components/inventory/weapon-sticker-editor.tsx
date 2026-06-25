"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { WeaponStickerSlotGrid } from "@/components/inventory/weapon-sticker-slot-grid";
import { StickerImage } from "@/components/inventory/sticker-image";
import { useWeaponStickerLimits } from "@/components/inventory/use-weapon-sticker-limits";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { cn } from "@/lib/utils";
import { useWeaponStickerState } from "@/components/inventory/use-weapon-sticker-state";

type WeaponStickerEditorProps = {
  weaponId: string;
  team: LoadoutTeam;
  embedded?: boolean;
  onSaved?: () => void;
  maxStickerSlots?: number;
  canUseStickers?: boolean;
};

export function WeaponStickerEditor({
  weaponId,
  team,
  embedded = false,
  onSaved,
  maxStickerSlots = 4,
  canUseStickers = true,
}: WeaponStickerEditorProps) {
  const t = useTranslations("inventory");
  const { limits } = useWeaponStickerLimits(weaponId, maxStickerSlots);
  const pickerActive = limits.supportsStickers && canUseStickers;
  const state = useWeaponStickerState(weaponId, team, Boolean(weaponId) && pickerActive, pickerActive, {
    planMaxStickerSlots: maxStickerSlots,
  });

  async function save() {
    const ok = await state.save();
    if (ok) onSaved?.();
  }

  if (!limits.supportsStickers) {
    return (
      <div className={cn(!embedded && "mt-4", "rounded-xl p-4", surfaceSubtleClass)}>
        <p className="text-sm text-muted">{t("stickersWeaponUnsupported")}</p>
      </div>
    );
  }

  if (!canUseStickers) {
    return (
      <div className={cn(!embedded && "mt-4", "rounded-xl p-4", surfaceSubtleClass)}>
        <p className="text-sm text-muted">{t("stickersPlanRequired")}</p>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
      </div>
    );
  }

  return (
    <div className={cn(!embedded && "mt-4", "space-y-4")}>
      <WeaponStickerSlotGrid
        weaponId={weaponId}
        planMax={maxStickerSlots}
        slots={state.slots}
        slotLabels={state.slotLabels}
        slotImageUrls={state.slotImageUrls}
        activeSlot={state.activeSlot}
        onSelectSlot={(index) => {
          state.setActiveSlot(index);
          state.setPickerSearch("");
          state.loadPicker("", true);
        }}
        onClearSlot={(index) => state.clearSlot(index)}
        showClear
      />

      {state.activeSlot !== null && (
        <>
          <input
            className={cn("w-full rounded-xl border border-border px-3 py-2 text-sm", surfaceSubtleClass)}
            placeholder={t("stickersSearchPlaceholder")}
            value={state.pickerSearch}
            onChange={(e) => state.setPickerSearch(e.target.value)}
          />
          {state.pickerLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {state.pickerItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    state.selectSticker(
                      item.defIndex,
                      item.name,
                      state.activeSlot,
                      item.imageUrl,
                    )
                  }
                  className={cn(
                    "flex flex-col items-center rounded-xl border-2 p-2",
                    surfaceSubtleClass,
                    item.defIndex === state.slots[state.activeSlot!]
                      ? "border-primary"
                      : "border-border/30",
                  )}
                >
                  {item.imageUrl ? (
                    <StickerImage src={item.imageUrl} alt="" className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white/5" />
                  )}
                  <span className="mt-1 line-clamp-2 text-center text-[10px]">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" disabled={state.saving} onClick={save}>
          {state.saving ? t("stickersSaving") : t("stickersSave")}
        </Button>
      </div>
    </div>
  );
}
