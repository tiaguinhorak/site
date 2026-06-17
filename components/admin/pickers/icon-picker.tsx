"use client";

import { cn } from "@/lib/utils";
import { ICON_PRESETS } from "@/lib/admin/content-presets";
import { resolveIcon } from "@/lib/icon-map";

export function IconPicker({
  value,
  onChange,
  label = "Ícone",
}: {
  value: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {ICON_PRESETS.map((preset) => {
          const Icon = resolveIcon(preset.key);
          const active = value === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2 transition-all",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted hover:border-primary/40 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
