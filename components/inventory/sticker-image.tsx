"use client";

import { useState } from "react";
import { normalizeStickerImageUrl } from "@/lib/inventory/sticker-image-url";
import { cn } from "@/lib/utils";

type StickerImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
};

export function StickerImage({
  src,
  alt = "",
  className,
  fallbackClassName,
  fallbackLabel,
}: StickerImageProps) {
  const normalized = normalizeStickerImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!normalized || failed) {
    if (!fallbackLabel) return null;
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded bg-white/10 text-[8px] text-muted",
          fallbackClassName,
        )}
      >
        {fallbackLabel}
      </span>
    );
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
