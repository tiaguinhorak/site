"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { markEconomyImageLoaded } from "@/lib/inventory/preload-economy-images";

type RemoteImageProps = {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  showPlaceholder?: boolean;
  quality?: number;
  unoptimized?: boolean;
};

function imageAlreadyDecoded(img: HTMLImageElement | null): boolean {
  return Boolean(img && img.complete && img.naturalHeight > 0);
}

/**
 * Steam CDN images via native <img>.
 * Skeleton is an overlay (not opacity-0 on the img) so cached images still show
 * when onLoad does not fire.
 */
export function RemoteImage({
  src,
  alt = "",
  className,
  width,
  height,
  fill,
  priority,
  showPlaceholder = true,
  unoptimized: _unoptimized = true,
}: RemoteImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const markLoaded = useCallback(() => {
    markEconomyImageLoaded(src);
    setLoaded(true);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setRetryKey(0);
  }, [src]);

  useEffect(() => {
    if (imageAlreadyDecoded(imgRef.current)) {
      markLoaded();
    }
  }, [src, retryKey, markLoaded]);

  if (!src) return null;

  const showSkeleton = showPlaceholder && !loaded && !failed;

  const handleError = () => {
    if (retryKey < 1) {
      setRetryKey((k) => k + 1);
      return;
    }
    setFailed(true);
    setLoaded(false);
  };

  const imgSrc = retryKey > 0 ? `${src}${src.includes("?") ? "&" : "?"}_r=${retryKey}` : src;

  const imgProps = {
    ref: imgRef,
    src: imgSrc,
    alt,
    decoding: "async" as const,
    loading: (priority ? "eager" : "lazy") as "eager" | "lazy",
    fetchPriority: priority ? ("high" as const) : undefined,
    referrerPolicy: "no-referrer" as const,
    onLoad: markLoaded,
    onError: handleError,
  };

  if (fill) {
    return (
      <div className="relative h-full w-full">
        {!failed && (
          <img
            {...imgProps}
            className={cn("absolute inset-0 h-full w-full object-contain", className)}
          />
        )}
        {showSkeleton && (
          <Skeleton className="absolute inset-0 z-1 rounded-none" aria-hidden />
        )}
      </div>
    );
  }

  const w = width ?? 96;
  const h = height ?? 96;

  return (
    <div className="relative inline-block" style={{ width: w, height: h }}>
      {!failed && (
        <img
          {...imgProps}
          width={w}
          height={h}
          className={cn("h-full w-full object-contain", className)}
        />
      )}
      {showSkeleton && (
        <Skeleton className="absolute inset-0 z-1 rounded-none" aria-hidden />
      )}
    </div>
  );
}
