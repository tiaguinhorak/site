"use client";

import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";

type AvatarImageProps = {
  src: string;
  alt?: string;
  className?: string;
  size?: number;
};

export function AvatarImage({ src, alt = "", className, size = 32 }: AvatarImageProps) {
  return (
    <RemoteImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("h-full w-full", className)}
      sizes={`${size}px`}
    />
  );
}
