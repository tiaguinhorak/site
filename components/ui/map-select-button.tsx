"use client";

import type { ReactNode } from "react";
import { MapThumbnail } from "@/components/ui/map-thumbnail";
import { formatMapLabel } from "@/lib/servers/maps";
import { cn } from "@/lib/utils";

type MapSelectButtonProps = {
  mapId: string;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  thumbnailSize?: number;
};

export function MapSelectButton({
  mapId,
  label,
  active,
  disabled,
  onClick,
  children,
  className,
  thumbnailSize = 52,
}: MapSelectButtonProps) {
  const display = label ?? formatMapLabel(mapId);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted hover:border-primary/40",
        disabled && "opacity-60",
        className,
      )}
    >
      <MapThumbnail mapId={mapId} label={display} size={thumbnailSize} rounded="lg" />
      <span className="text-xs font-semibold leading-tight">{display}</span>
      {children}
    </button>
  );
}
