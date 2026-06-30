"use client";

import { useEffect, useState } from "react";
import {
  normalizeProfileColor,
  PROFILE_CUSTOMIZATION_COLORS,
} from "@/lib/profile/customization-presets";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ProfileColorPickerProps = {
  value: string | null;
  onChange: (color: string | null) => void;
  defaultLabel: string;
  invalidMessage: string;
  pickerLabel: string;
  hexLabel: string;
  disabled?: boolean;
};

export function ProfileColorPicker({
  value,
  onChange,
  defaultLabel,
  invalidMessage,
  pickerLabel,
  hexLabel,
  disabled,
}: ProfileColorPickerProps) {
  const [hexInput, setHexInput] = useState(value ?? "");

  useEffect(() => {
    setHexInput(value ?? "");
  }, [value]);

  const isCustom =
    Boolean(value) &&
    !PROFILE_CUSTOMIZATION_COLORS.includes(
      value as (typeof PROFILE_CUSTOMIZATION_COLORS)[number],
    );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-9 rounded-lg border px-3 text-xs",
            !value && "border-primary ring-1 ring-primary",
          )}
          onClick={() => onChange(null)}
        >
          {defaultLabel}
        </button>
        {PROFILE_CUSTOMIZATION_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={disabled}
            aria-label={color}
            className={cn(
              "h-9 w-9 rounded-lg border border-border",
              value === color && "ring-2 ring-white",
            )}
            style={{ background: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-muted">{pickerLabel}</span>
          <input
            type="color"
            disabled={disabled}
            value={normalizeProfileColor(hexInput || value || "") ?? "#6366f1"}
            className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
            onChange={(e) => {
              setHexInput(e.target.value);
              onChange(e.target.value);
            }}
          />
        </label>
        <label className="flex min-w-32 flex-1 flex-col gap-1.5 text-xs">
          <span className="font-medium text-muted">{hexLabel}</span>
          <input
            type="text"
            disabled={disabled}
            value={hexInput}
            placeholder="#6366f1"
            className={cn(
              "h-10 rounded-lg border border-border bg-background px-3 font-mono text-sm",
              isCustom && "border-primary ring-1 ring-primary/40",
            )}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={() => {
              const normalized = normalizeProfileColor(hexInput);
              if (!normalized && hexInput.trim()) {
                toast.error(invalidMessage);
                setHexInput(value ?? "");
                return;
              }
              if (normalized) onChange(normalized);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const normalized = normalizeProfileColor(hexInput);
              if (!normalized) {
                toast.error(invalidMessage);
                return;
              }
              onChange(normalized);
            }}
          />
        </label>
      </div>
    </div>
  );
}
