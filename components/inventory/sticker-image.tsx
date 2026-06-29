"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeStickerImageUrl } from "@/lib/inventory/sticker-image-url";
import {
  markEconomyImageLoaded,
  preloadEconomyImage,
} from "@/lib/inventory/preload-economy-images";
import { cn } from "@/lib/utils";

type StickerImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
};

function imageAlreadyDecoded(img: HTMLImageElement | null): boolean {
  return Boolean(img && img.complete && img.naturalHeight > 0);
}

export function StickerImage({
  src,
  alt = "",
  className,
  fallbackClassName,
  fallbackLabel,
}: StickerImageProps) {
  const normalized = normalizeStickerImageUrl(src);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const markLoaded = useCallback(() => {
    if (!normalized) return;
    markEconomyImageLoaded(normalized);
    setLoaded(true);
    setFailed(false);
  }, [normalized]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setRetryKey(0);
    if (normalized) {
      requestAnimationFrame(() => preloadEconomyImage(normalized, "sticker"));
    }
  }, [normalized]);

  useEffect(() => {
    if (imageAlreadyDecoded(imgRef.current)) {
      markLoaded();
    }
  }, [normalized, retryKey, markLoaded]);

  if (!normalized) {
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

  if (failed) {
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

  const imgSrc =
    retryKey > 0
      ? `${normalized}${normalized.includes("?") ? "&" : "?"}_r=${retryKey}`
      : normalized;

  return (
    <span className="relative inline-block">
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        decoding="async"
        loading="lazy"
        className={cn(className, !loaded && "opacity-0")}
        onLoad={markLoaded}
        onError={() => {
          if (retryKey < 1) {
            setRetryKey((k) => k + 1);
            return;
          }
          setFailed(true);
        }}
      />
    </span>
  );
}
