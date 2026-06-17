"use client";

import { cn } from "@/lib/utils";
import {
  GRADIENT_PRESETS,
  findGradientByClasses,
} from "@/lib/admin/content-presets";

export function GradientPicker({
  value,
  onChange,
  label = "Cor / gradiente",
}: {
  value: string;
  onChange: (classes: string) => void;
  label?: string;
}) {
  const selected = findGradientByClasses(value);

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {GRADIENT_PRESETS.map((preset) => {
          const active = value === preset.classes;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.classes)}
              className={cn(
                "group relative overflow-hidden rounded-xl border-2 p-0.5 transition-all",
                active
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div
                className="h-10 w-full rounded-lg sm:h-11"
                style={{
                  background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                }}
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        Selecionado: <span className="text-foreground">{selected?.label ?? "Personalizado"}</span>
      </p>
    </div>
  );
}
