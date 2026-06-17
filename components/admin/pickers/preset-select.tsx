"use client";

import { cn } from "@/lib/utils";

export function PresetSelect({
  value,
  onChange,
  options,
  label,
  allowCustom = true,
  customPlaceholder = "Valor personalizado...",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  label: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
}) {
  const isPreset = options.includes(value);

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              value === opt
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted hover:border-primary/40",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {allowCustom && (
        <input
          type="text"
          placeholder={customPlaceholder}
          value={isPreset ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
