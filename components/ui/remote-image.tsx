"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
};

export function RemoteImage({
  src,
  alt = "",
  className,
  width,
  height,
  fill,
  sizes,
  priority,
  showPlaceholder = true,
}: RemoteImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  const showSkeleton = showPlaceholder && !loaded;

  if (fill) {
    return (
      <div className="relative h-full w-full">
        {showSkeleton && (
          <Skeleton className="absolute inset-0 rounded-none" aria-hidden />
        )}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "96px"}
          className={cn(
            "object-cover transition-opacity duration-300",
            showSkeleton ? "opacity-0" : "opacity-100",
            className,
          )}
          referrerPolicy="no-referrer"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const w = width ?? 96;
  const h = height ?? 96;

  return (
    <div className="relative inline-block" style={{ width: w, height: h }}>
      {showSkeleton && (
        <Skeleton className="absolute inset-0 rounded-none" aria-hidden />
      )}
      <Image
        src={src}
        alt={alt}
        width={w}
        height={h}
        sizes={sizes ?? `${w}px`}
        className={cn(
          "object-cover transition-opacity duration-300",
          showSkeleton ? "opacity-0" : "opacity-100",
          className,
        )}
        referrerPolicy="no-referrer"
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
