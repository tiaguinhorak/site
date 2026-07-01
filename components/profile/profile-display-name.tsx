"use client";

import type { CSSProperties } from "react";
import { PlanBadge, PlanBadgeDisplay } from "@/components/profile/plan-badge";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { cn } from "@/lib/utils";

type ProfileDisplayNameProps = {
  nickname: string;
  displayName?: string;
  plan: "free" | "premium" | "elite";
  customization?: PublicProfileCustomization | null;
  className?: string;
  nameClassName?: string;
  badgeSize?: "sm" | "md" | "lg";
  showPlanBadge?: boolean;
  /** Pre-translated plan label (avoids client intl on public SSR pages). */
  planLabel?: string;
};

export function ProfileDisplayName({
  nickname,
  displayName,
  plan,
  customization,
  className,
  nameClassName,
  badgeSize = "md",
  showPlanBadge,
  planLabel,
}: ProfileDisplayNameProps) {
  const shouldShowBadge =
    showPlanBadge ??
    (customization ? customization.profileShowPlanBadge : plan !== "free");

  const adminRainbow = customization?.frameIsRainbow;
  const accentColor = customization?.accentColor;

  const visibleName = displayName ?? nickname;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          adminRainbow ? "profile-admin-accent-text" : "text-foreground",
          accentColor && !adminRainbow && "profile-custom-accent-text",
          nameClassName,
        )}
        style={
          adminRainbow
            ? undefined
            : accentColor
              ? ({ ["--profile-accent" as string]: accentColor } as CSSProperties)
              : undefined
        }
      >
        {visibleName}
      </span>
      {shouldShowBadge ? (
        planLabel ? (
          <PlanBadgeDisplay plan={plan} label={planLabel} size={badgeSize} />
        ) : (
          <PlanBadge plan={plan} size={badgeSize} />
        )
      ) : null}
    </span>
  );
}
