"use client";

import type { CSSProperties, ReactNode } from "react";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import {
  isProfileBannerAnimated,
  resolveProfileBannerUrl,
} from "@/lib/profile/banner";
import { cn } from "@/lib/utils";
import { ProfileMediaImage } from "@/components/profile/profile-media-image";

type ProfileCustomizationHeroProps = {
  customization: PublicProfileCustomization | null;
  bannerUrl?: string | null;
  /** When false, hides GIF banners pending moderation (public profile). */
  ownerPreview?: boolean;
  /** Load banner immediately (owner dashboard). */
  priority?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  glass?: boolean;
};

export function ProfileCustomizationHero({
  customization,
  bannerUrl,
  ownerPreview = false,
  priority = false,
  children,
  className,
  contentClassName,
  glass = true,
}: ProfileCustomizationHeroProps) {
  const bannerFields = customization
    ? {
        profileBannerUrl: bannerUrl ?? customization.profileBannerUrl,
        profileBannerMediaType: customization.profileBannerMediaType,
        profileBannerModerationStatus: customization.profileBannerModerationStatus,
      }
    : { profileBannerUrl: bannerUrl ?? null };

  const banner = resolveProfileBannerUrl(bannerFields, {
    publicView: !ownerPreview,
  });
  const bannerAnimated = isProfileBannerAnimated(bannerFields, {
    publicView: !ownerPreview,
  });
  const hasCustomSurface = Boolean(customization);
  const accent = customization?.accentColor;
  const showTheme = Boolean(customization && !banner);
  const adminRainbow = customization?.frameIsRainbow;
  const styleVars = customization?.styleVars as CSSProperties | undefined;

  return (
    <div
      className={cn(
        adminRainbow ? "profile-card-admin-rainbow" : "rounded-card",
        !adminRainbow && customization?.borderCardClass,
        className,
      )}
      style={styleVars}
      data-motion-safe={adminRainbow ? true : undefined}
    >
      <div className={cn("overflow-hidden rounded-card", glass && "glass-strong")}>
        {banner ? (
          <div className="relative h-48 w-full overflow-hidden sm:h-56 md:h-64">
            <ProfileMediaImage
              src={banner}
              className="h-full w-full"
              priority={priority || ownerPreview}
              pauseGifOffscreen={!priority && !ownerPreview}
            />
            {bannerAnimated ? (
              <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                GIF
              </span>
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/30"
              aria-hidden
            />
          </div>
        ) : null}

        <div
          className={cn(
            "relative",
            contentClassName ?? "p-6 sm:p-8",
            customization?.backgroundClass,
          )}
        >
          {customization?.useCustomBackgroundColor ? (
            <div className="profile-bg-custom pointer-events-none absolute inset-0" aria-hidden />
          ) : null}
          {showTheme && customization?.themeHeroGradient ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-0",
                customization.useCustomThemeColor && "profile-theme-custom-gradient",
              )}
              style={{ backgroundImage: customization.themeHeroGradient }}
              aria-hidden
            />
          ) : null}

          {hasCustomSurface ? (
            <div
              className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--background)_72%,transparent)] dark:bg-[color-mix(in_srgb,var(--background)_58%,transparent)]"
              aria-hidden
            />
          ) : null}

          {showTheme ? (
            <div
              className={cn(
                "pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl",
                customization?.useCustomThemeColor && "profile-theme-custom-glow",
              )}
              style={{ background: customization?.themeGlowColor ?? "var(--glow-1)" }}
              aria-hidden
            />
          ) : null}

          <div
            className={cn(
              "relative text-foreground",
              hasCustomSurface &&
                "[&_.glass]:border-border/60 [&_.glass]:bg-[color-mix(in_srgb,var(--background)_88%,transparent)] [&_.glass]:text-foreground",
              accent &&
                "[&_[data-profile-accent]]:text-[var(--profile-accent)] [&_[data-profile-accent-bg]]:bg-[color-mix(in_srgb,var(--profile-accent)_14%,transparent)]",
            )}
            style={
              accent
                ? ({ ["--profile-accent" as string]: accent } as React.CSSProperties)
                : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
