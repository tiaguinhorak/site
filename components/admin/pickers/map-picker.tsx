"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CS_MAP_PRESETS } from "@/lib/admin/content-presets";
import { formatMapLabel } from "@/lib/servers/maps";
import { resolveMapId } from "@/lib/servers/map-images";
import { MapThumbnail } from "@/components/ui/map-thumbnail";

export function MapPicker({
  value,
  onChange,
  label = "Mapa",
  allowCustom = true,
  suggestedMapIds,
}: {
  value: string;
  onChange: (map: string) => void;
  label?: string;
  allowCustom?: boolean;
  /** Mapas sugeridos (ex.: do modo warmup) — aparecem no topo. */
  suggestedMapIds?: string[];
}) {
  const normalizedValue = resolveMapId(value) || value;
  const [custom, setCustom] = useState(
    () => !CS_MAP_PRESETS.some((m) => m.id === normalizedValue) && normalizedValue ? normalizedValue : "",
  );

  const suggested = useMemo(() => {
    if (!suggestedMapIds?.length) return [];
    const seen = new Set<string>();
    return suggestedMapIds
      .map((id) => resolveMapId(id) || id)
      .filter((id) => {
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [suggestedMapIds]);

  const presetIds = useMemo(() => new Set<string>(CS_MAP_PRESETS.map((m) => m.id)), []);
  const groups = [...new Set(CS_MAP_PRESETS.map((m) => m.group))];

  function renderMapButton(mapId: string, mapLabel: string, highlightSuggested = false) {
    const active = normalizedValue === mapId;
    return (
      <button
        key={mapId}
        type="button"
        onClick={() => onChange(mapId)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
          active
            ? "border-primary bg-primary/15 text-primary"
            : highlightSuggested
              ? "border-amber-500/40 text-foreground hover:border-amber-400/70"
              : "border-border text-muted hover:border-primary/40",
        )}
      >
        <MapThumbnail mapId={mapId} label={mapLabel} size={28} rounded="md" />
        {mapLabel}
      </button>
    );
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>

      {suggested.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500/90">
            Sugeridos para este modo
          </p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((mapId) => renderMapButton(mapId, formatMapLabel(mapId), true))}
          </div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group} className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {group}
          </p>
          <div className="flex flex-wrap gap-2">
            {CS_MAP_PRESETS.filter((m) => m.group === group).map((map) =>
              renderMapButton(map.id, map.label),
            )}
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
              const next = e.target.value.trim();
              if (next) onChange(resolveMapId(next) || next);
            }}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          />
          {custom.trim() && !presetIds.has(normalizedValue) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <MapThumbnail mapId={custom} label={custom} size={32} />
              {formatMapLabel(custom)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
