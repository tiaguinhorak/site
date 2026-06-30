"use client";

import { useMemo, useState } from "react";
import { Map } from "lucide-react";
import { getMapIconUrls } from "@/lib/servers/map-images";
import { cn } from "@/lib/utils";

type MapThumbnailProps = {
  mapId: string;
  label?: string;
  size?: number;
  className?: string;
  rounded?: "md" | "lg" | "xl";
};

export function MapThumbnail({
  mapId,
  label,
  size = 40,
  className,
  rounded = "lg",
}: MapThumbnailProps) {
  const urls = useMemo(() => getMapIconUrls(mapId), [mapId]);
  const [urlIndex, setUrlIndex] = useState(0);
  const src = urls[urlIndex] ?? null;
  const radius =
    rounded === "xl" ? "rounded-xl" : rounded === "md" ? "rounded-md" : "rounded-lg";

  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-muted",
          radius,
          className,
        )}
        style={{ width: size, height: size }}
        title={label ?? mapId}
      >
        <Map className="h-4 w-4" style={{ width: size * 0.45, height: size * 0.45 }} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external SVG/PNG from GitHub CDN
    <img
      src={src}
      alt={label ?? mapId}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 object-cover", radius, className)}
      style={{ width: size, height: size }}
      onError={() => {
        setUrlIndex((current) => (current + 1 < urls.length ? current + 1 : urls.length));
      }}
    />
  );
}
