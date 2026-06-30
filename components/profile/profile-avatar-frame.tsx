"use client";

import type { CSSProperties } from "react";
import { ProfileMediaImage } from "@/components/profile/profile-media-image";
import type {
  AvatarFrameSize,
  ProfileFrameOverlayBlendMode,
  ProfileFrameOverlayCorner,
  ProfileFrameOverlayLayout,
} from "@/lib/profile/customization-presets";
import {
  DEFAULT_OVERLAY_CORNER,
  DEFAULT_OVERLAY_CORNER_SCALE,
  DEFAULT_OVERLAY_HOLE_RATIO,
  resolveWrapFrameOuterPx,
} from "@/lib/profile/customization-presets";
import { cn } from "@/lib/utils";

const SIZE: Record<AvatarFrameSize, string> = {
  xs: "h-7 w-7 rounded-md text-[10px]",
  sm: "h-8 w-8 rounded-md text-xs",
  md: "h-11 w-11 rounded-lg text-lg",
  lg: "h-28 w-28 rounded-xl text-4xl",
  xl: "h-32 w-32 rounded-xl text-4xl",
};

const RAINBOW_INNER_ROUNDED: Record<AvatarFrameSize, string> = {
  xs: "rounded-[3px]",
  sm: "rounded-[3px]",
  md: "rounded-[5px]",
  lg: "rounded-[10px]",
  xl: "rounded-[11px]",
};

const DEFAULT_FRAME = "border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]";

const CORNER_POSITION: Record<ProfileFrameOverlayCorner, string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

function AvatarContent({
  avatarUrl,
  nickname,
  priority,
  className,
}: {
  avatarUrl: string | null;
  nickname: string;
  priority?: boolean;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <ProfileMediaImage
        src={avatarUrl}
        className={cn("h-full w-full", className)}
        priority={priority}
        pauseGifOffscreen={!priority}
      />
    );
  }

  return (
    <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display font-bold text-white">
      {nickname.slice(0, 2)}
    </span>
  );
}

function FrameOverlayAsset({
  src,
  blendMode,
  layout,
  corner,
  cornerScale,
  priority,
}: {
  src: string;
  blendMode: ProfileFrameOverlayBlendMode;
  layout: ProfileFrameOverlayLayout;
  corner?: ProfileFrameOverlayCorner | null;
  cornerScale?: number | null;
  priority?: boolean;
}) {
  if (layout === "corner") {
    const anchor = corner ?? DEFAULT_OVERLAY_CORNER;
    const scale = cornerScale ?? DEFAULT_OVERLAY_CORNER_SCALE;

    return (
      <div
        className={cn("pointer-events-none absolute z-[1]", CORNER_POSITION[anchor])}
        style={{
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          mixBlendMode: blendMode,
        }}
        aria-hidden
      >
        <ProfileMediaImage
          src={src}
          className="h-full w-full"
          objectFit="contain"
          priority={priority}
          pauseGifOffscreen={!priority}
        />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ mixBlendMode: blendMode }}
      aria-hidden
    >
      <ProfileMediaImage
        src={src}
        className="h-full w-full"
        objectFit={layout === "wrap" ? "contain" : "cover"}
        priority={priority}
        pauseGifOffscreen={!priority}
      />
    </div>
  );
}

export function ProfileAvatarFrame({
  avatarUrl,
  nickname,
  frameRingClass,
  frameGlowClass,
  frameGlowShadow,
  frameIsRainbow,
  frameOverlayUrl,
  frameOverlayLayout = "cover",
  frameOverlayHoleRatio,
  frameOverlayCorner,
  frameOverlayCornerScale,
  frameOverlayBlendMode = "screen",
  styleVars,
  size = "lg",
  className,
  priority,
}: {
  avatarUrl: string | null;
  nickname: string;
  frameRingClass?: string;
  frameGlowClass?: string | null;
  frameGlowShadow?: string | null;
  frameIsRainbow?: boolean;
  frameOverlayUrl?: string | null;
  frameOverlayLayout?: ProfileFrameOverlayLayout;
  frameOverlayHoleRatio?: number | null;
  frameOverlayCorner?: ProfileFrameOverlayCorner | null;
  frameOverlayCornerScale?: number | null;
  frameOverlayBlendMode?: ProfileFrameOverlayBlendMode;
  styleVars?: CSSProperties;
  size?: AvatarFrameSize;
  className?: string;
  priority?: boolean;
}) {
  if (frameOverlayUrl && frameOverlayLayout === "wrap") {
    const holeRatio = frameOverlayHoleRatio ?? DEFAULT_OVERLAY_HOLE_RATIO;
    const outerPx = resolveWrapFrameOuterPx(size, holeRatio);

    return (
      <div
        className={cn(
          "profile-frame-wrap relative inline-flex shrink-0 items-center justify-center font-display font-bold text-white",
          className,
        )}
        style={{ width: outerPx, height: outerPx, ...styleVars }}
      >
        <div className={cn("relative z-0 shrink-0 overflow-hidden", SIZE[size])}>
          <AvatarContent avatarUrl={avatarUrl} nickname={nickname} priority={priority} />
        </div>
        <FrameOverlayAsset
          src={frameOverlayUrl}
          blendMode={frameOverlayBlendMode}
          layout="wrap"
          priority={priority}
        />
      </div>
    );
  }

  if (frameOverlayUrl && frameOverlayLayout === "corner") {
    return (
      <div
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden box-border font-display font-bold text-white",
          SIZE[size],
          className,
        )}
        style={styleVars}
      >
        <AvatarContent avatarUrl={avatarUrl} nickname={nickname} priority={priority} />
        <FrameOverlayAsset
          src={frameOverlayUrl}
          blendMode={frameOverlayBlendMode}
          layout="corner"
          corner={frameOverlayCorner}
          cornerScale={frameOverlayCornerScale}
          priority={priority}
        />
      </div>
    );
  }

  if (frameOverlayUrl && frameOverlayLayout === "cover") {
    return (
      <div
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden box-border font-display font-bold text-white",
          SIZE[size],
          className,
        )}
        style={styleVars}
      >
        <AvatarContent avatarUrl={avatarUrl} nickname={nickname} priority={priority} />
        <FrameOverlayAsset
          src={frameOverlayUrl}
          blendMode={frameOverlayBlendMode}
          layout="cover"
          priority={priority}
        />
      </div>
    );
  }

  if (frameIsRainbow) {
    return (
      <div
        className={cn("profile-frame-rainbow box-border", SIZE[size], className)}
        data-motion-safe
      >
        <div
          className={cn(
            "profile-frame-rainbow-inner overflow-hidden",
            RAINBOW_INNER_ROUNDED[size],
          )}
        >
          <AvatarContent avatarUrl={avatarUrl} nickname={nickname} priority={priority} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden box-border font-display font-bold text-white",
        SIZE[size],
        frameRingClass ?? DEFAULT_FRAME,
        !frameGlowShadow && frameGlowClass,
        className,
      )}
      style={{
        ...(frameGlowShadow ? { boxShadow: frameGlowShadow } : undefined),
        ...styleVars,
      }}
    >
      <AvatarContent avatarUrl={avatarUrl} nickname={nickname} priority={priority} />
    </div>
  );
}
