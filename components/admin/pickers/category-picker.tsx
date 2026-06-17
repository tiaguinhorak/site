"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORY_PRESETS } from "@/lib/admin/content-presets";

export function CategoryPicker({
  value,
  onChange,
  presets = NEWS_CATEGORY_PRESETS,
  label = "Categoria",
}: {
  value: string;
  onChange: (category: string) => void;
  presets?: readonly string[];
  label?: string;
}) {
  const isPreset = (presets as readonly string[]).includes(value);
  const [custom, setCustom] = useState(isPreset ? "" : value);

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {presets.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCustom("");
              onChange(cat);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              value === cat && !custom
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted hover:border-primary/40",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <input
          type="text"
          placeholder="Categoria personalizada..."
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            if (e.target.value.trim()) onChange(e.target.value.trim());
          }}
          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
