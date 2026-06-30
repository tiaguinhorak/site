"use client";

import type { CSSProperties } from "react";
import { ProfileAvatarFrame } from "@/components/profile/profile-avatar-frame";
import { ProfileMediaImage } from "@/components/profile/profile-media-image";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { cn } from "@/lib/utils";

type UserProfileAvatarProps = {
  avatarUrl: string | null;
  nickname: string;
  animated?: boolean;
  customization?: PublicProfileCustomization | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Load avatar immediately (profile header / preview). */
  priority?: boolean;
};

export function UserProfileAvatar({
  avatarUrl,
  nickname,
  customization,
  size = "md",
  className,
  priority = false,
}: UserProfileAvatarProps) {
  const src = avatarUrl ?? getDefaultAvatarPresetUrl();

  if (customization) {
    return (
      <ProfileAvatarFrame
        avatarUrl={src}
        nickname={nickname}
        frameRingClass={customization.frameRingClass}
        frameGlowClass={customization.frameGlowClass}
        frameGlowShadow={customization.frameGlowShadow}
        frameIsRainbow={customization.frameIsRainbow}
        frameOverlayUrl={customization.frameOverlayUrl}
        frameOverlayLayout={customization.frameOverlayLayout}
        frameOverlayHoleRatio={customization.frameOverlayHoleRatio}
        frameOverlayCorner={customization.frameOverlayCorner}
        frameOverlayCornerScale={customization.frameOverlayCornerScale}
        frameOverlayBlendMode={customization.frameOverlayBlendMode}
        styleVars={customization.styleVars as CSSProperties}
        size={size}
        className={className}
        priority={priority}
      />
    );
  }

  const plainSizeClass =
    size === "xs"
      ? "h-7 w-7 rounded-lg text-[10px]"
      : size === "sm"
        ? "h-8 w-8 rounded-lg text-xs"
        : size === "md"
          ? "h-11 w-11 rounded-xl text-lg"
          : size === "lg"
            ? "h-14 w-14 rounded-2xl text-2xl"
            : "h-28 w-28 rounded-2xl text-4xl";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] font-display font-bold text-white",
        plainSizeClass,
        className,
      )}
    >
      <ProfileMediaImage
        src={src}
        className="h-full w-full"
        priority={priority}
        pauseGifOffscreen={!priority}
      />
    </div>
  );
}
