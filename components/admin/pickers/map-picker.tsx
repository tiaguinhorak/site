"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CS_MAP_PRESETS } from "@/lib/admin/content-presets";

export function MapPicker({
  value,
  onChange,
  label = "Mapa",
  allowCustom = true,
}: {
  value: string;
  onChange: (map: string) => void;
  label?: string;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState(
    () => !CS_MAP_PRESETS.some((m) => m.id === value) && value ? value : "",
  );
  const groups = [...new Set(CS_MAP_PRESETS.map((m) => m.group))];

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {groups.map((group) => (
        <div key={group} className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {group}
          </p>
          <div className="flex flex-wrap gap-2">
            {CS_MAP_PRESETS.filter((m) => m.group === group).map((map) => (
              <button
                key={map.id}
                type="button"
                onClick={() => onChange(map.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  value === map.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted hover:border-primary/40",
                )}
              >
                {map.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {allowCustom && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Mapa customizado (ex: de_mirage)"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              if (e.target.value.trim()) onChange(e.target.value.trim());
            }}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
