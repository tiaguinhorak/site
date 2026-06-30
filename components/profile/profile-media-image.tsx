"use client";

import { cn } from "@/lib/utils";
import { isAnimatedGifUrl, useLazyMedia } from "@/lib/hooks/use-lazy-media";

type ProfileMediaImageProps = {
  src: string;
  alt?: string;
  className?: string;
  /** Load immediately without viewport gating (owner profile, preview). */
  priority?: boolean;
  /** When true off-screen GIFs stop decoding to save CPU. */
  pauseGifOffscreen?: boolean;
  objectFit?: "cover" | "contain";
};

export function ProfileMediaImage({
  src,
  alt = "",
  className,
  priority = false,
  pauseGifOffscreen = true,
  objectFit = "cover",
}: ProfileMediaImageProps) {
  const { ref, visible } = useLazyMedia({ priority });
  const isGif = isAnimatedGifUrl(src);
  const shouldLoad = priority || visible;
  const showMedia = shouldLoad && (!isGif || !pauseGifOffscreen || visible);

  return (
    <div ref={ref} className={cn("h-full w-full overflow-hidden", className)}>
      {showMedia ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          className={cn("h-full w-full", objectFit === "cover" ? "object-cover" : "object-contain")}
        />
      ) : (
        <div
          className="h-full w-full bg-[color-mix(in_srgb,var(--muted)_18%,var(--background))]"
          aria-hidden
        />
      )}
    </div>
  );
}
