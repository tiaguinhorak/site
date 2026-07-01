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
    <div className={cn("rounded-xl p-3", surfaceSubtleClass)}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {t("floatPatternTitle")}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-muted">
          {WEAR_TIER_LABEL[wearTier] ?? wearTier}
        </span>
      </div>

      <label className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>{t("floatLabel")}</span>
        <span className="font-mono text-foreground">{floatInput.toFixed(4)}</span>
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.0001}
        value={floatInput}
        disabled={disabled || saving}
        onChange={(e) => setFloatInput(Number(e.target.value))}
        className="mb-3 w-full accent-primary"
      />

      <label className="mb-1 block text-xs text-muted">
        {t("patternLabel")} ({MIN_SKIN_SEED}–{MAX_SKIN_SEED})
      </label>
      <input
        type="number"
        min={MIN_SKIN_SEED}
        max={MAX_SKIN_SEED}
        value={seedInput}
        disabled={disabled || saving}
        onChange={(e) => setSeedInput(Number(e.target.value))}
        className={cn("mb-3 w-full rounded-lg px-3 py-2 text-sm", surfaceInputClass)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
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
