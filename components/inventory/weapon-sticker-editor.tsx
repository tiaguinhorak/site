"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { cn } from "@/lib/utils";
import { useWeaponStickerState } from "@/components/inventory/use-weapon-sticker-state";

type WeaponStickerEditorProps = {
  weaponId: string;
  team: LoadoutTeam;
  embedded?: boolean;
  onSaved?: () => void;
};

export function WeaponStickerEditor({
  weaponId,
  team,
  embedded = false,
  onSaved,
}: WeaponStickerEditorProps) {
  const t = useTranslations("inventory");
  const state = useWeaponStickerState(weaponId, team, Boolean(weaponId));

  async function save() {
    const ok = await state.save();
    if (ok) onSaved?.();
  }

  if (state.loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
      </div>
    );
  }

  return (
    <div className={cn(!embedded && "mt-4")}>
      <div className="space-y-3">
        {state.slots.map((defIndex, index) => (
          <div
            key={index}
            className={cn("flex items-center gap-2 rounded-xl p-2", surfaceSubtleClass)}
          >
            <span className="w-8 text-center text-xs font-medium text-muted">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {state.slotLabels[index] ||
                  (defIndex > 0 ? `def_index ${defIndex}` : t("stickersEmptySlot"))}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                state.setActiveSlot(index);
                state.setPickerSearch("");
                state.loadPicker("");
              }}
            >
              {t("stickersChoose")}
            </Button>
            {defIndex > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => state.clearSlot(index)}>
                {t("stickersClear")}
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted">{t("stickersHint")}</p>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" disabled={state.saving} onClick={save}>
          {state.saving ? t("stickersSaving") : t("stickersSave")}
        </Button>
      </div>
    </div>
  );
}
