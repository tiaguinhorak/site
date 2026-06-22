"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type RemoteImageProps = {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
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
}: RemoteImageProps) {
  if (!src) return null;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "96px"}
        className={cn("object-cover", className)}
        referrerPolicy="no-referrer"
        priority={priority}
      />
    );
  }

  const w = width ?? 96;
  const h = height ?? 96;

  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes={sizes ?? `${w}px`}
      className={cn("object-cover", className)}
      referrerPolicy="no-referrer"
      priority={priority}
    />
  );
}
