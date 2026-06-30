"use client";

import { MapThumbnail } from "@/components/ui/map-thumbnail";
import { formatMapLabel } from "@/lib/servers/maps";
import { cn } from "@/lib/utils";

type MapChipProps = {
  mapId: string;
  label?: string;
  className?: string;
  size?: number;
};

export function MapChip({ mapId, label, className, size = 20 }: MapChipProps) {
  const display = label ?? formatMapLabel(mapId);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300",
        className,
      )}
    >
      <MapThumbnail mapId={mapId} label={display} size={size} rounded="md" />
      {display}
    </span>
  );
}
