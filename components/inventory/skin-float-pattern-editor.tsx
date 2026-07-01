"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SKIN_FLOAT,
  MAX_SKIN_SEED,
  MIN_SKIN_SEED,
  clampSkinFloat,
  clampSkinSeed,
  floatToWearTier,
} from "@/lib/inventory/skin-wear";
import { cn } from "@/lib/utils";
import { surfaceInputClass, surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { toast } from "@/lib/toast";

type SkinFloatPatternEditorProps = {
  catalogSkinId: string;
  floatValue?: number;
  seed?: number;
  disabled?: boolean;
  onSaved?: () => void;
};

const WEAR_TIER_LABEL: Record<string, string> = {
  factory_new: "Factory New",
  minimal_wear: "Minimal Wear",
  field_tested: "Field-Tested",
  well_worn: "Well-Worn",
  battle_scarred: "Battle-Scarred",
};

export function SkinFloatPatternEditor({
  catalogSkinId,
  floatValue,
  seed,
  disabled,
  onSaved,
}: SkinFloatPatternEditorProps) {
  const t = useTranslations("inventory");
  const [floatInput, setFloatInput] = useState(floatValue ?? DEFAULT_SKIN_FLOAT);
  const [seedInput, setSeedInput] = useState(seed ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFloatInput(floatValue ?? DEFAULT_SKIN_FLOAT);
  }, [catalogSkinId, floatValue]);

  useEffect(() => {
    setSeedInput(seed ?? 0);
  }, [catalogSkinId, seed]);

  const wearTier = floatToWearTier(floatInput);
  const dirty =
    clampSkinFloat(floatInput) !== clampSkinFloat(floatValue ?? DEFAULT_SKIN_FLOAT) ||
    clampSkinSeed(seedInput) !== clampSkinSeed(seed ?? 0);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/customize", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogSkinId,
          floatValue: clampSkinFloat(floatInput),
          seed: clampSkinSeed(seedInput),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? t("gameSyncPartial"));
        return;
      }
      toast.success(t("floatPatternSaved"));
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("w-full min-w-0 rounded-xl p-3 sm:p-4", surfaceSubtleClass)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {t("floatPatternTitle")}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-muted">
          {WEAR_TIER_LABEL[wearTier] ?? wearTier}
        </span>
      </div>

      <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <label className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
            <span className="truncate">{t("floatLabel")}</span>
            <span className="shrink-0 font-mono text-foreground">{floatInput.toFixed(4)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.0001}
            value={floatInput}
            disabled={disabled || saving}
            onChange={(e) => setFloatInput(Number(e.target.value))}
            className="h-2 w-full min-w-0 accent-primary"
          />
        </div>

        <div className="min-w-0">
          <label className="mb-1 block truncate text-xs text-muted">
            {t("patternLabel")} ({MIN_SKIN_SEED}–{MAX_SKIN_SEED})
          </label>
          <input
            type="number"
            min={MIN_SKIN_SEED}
            max={MAX_SKIN_SEED}
            value={seedInput}
            disabled={disabled || saving}
            onChange={(e) => setSeedInput(Number(e.target.value))}
            className={cn("h-11 w-full min-w-0 rounded-lg px-3 text-sm", surfaceInputClass)}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 w-full sm:mt-4"
        disabled={disabled || saving || !dirty ? true : undefined}
        onClick={handleSave}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 motion-safe-spin" />
        ) : (
          t("floatPatternSave")
        )}
      </Button>
    </div>
  );
}
