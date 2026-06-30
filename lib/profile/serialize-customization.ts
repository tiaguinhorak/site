import type { Plan, User } from "@/lib/generated/prisma/client";
import type { ProfileCustomizationState, ProfileFrameOverlayBlendMode, ProfileFrameOverlayCorner, ProfileFrameOverlayLayout, ResolvedProfileStyleVars } from "@/lib/profile/customization-presets";
import {
  buildProfileStyleVars,
  resolveAvatarBorderStyles,
  resolveBackgroundStyles,
  resolveBorderCardClass,
  resolveThemeStyles,
} from "@/lib/profile/customization-presets";

export type PublicProfileCustomization = ProfileCustomizationState & {
  backgroundClass: string;
  frameRingClass: string;
  frameGlowClass: string | null;
  frameGlowShadow: string | null;
  frameIsRainbow: boolean;
  frameOverlayUrl: string | null;
  frameOverlayLayout: ProfileFrameOverlayLayout;
  frameOverlayHoleRatio: number | null;
  frameOverlayCorner: ProfileFrameOverlayCorner | null;
  frameOverlayCornerScale: number | null;
  frameOverlayBlendMode: ProfileFrameOverlayBlendMode;
  themeHeroGradient: string;
  themeGlowColor: string;
  borderCardClass: string;
  accentColor: string | null;
  styleVars: ResolvedProfileStyleVars;
  useCustomThemeColor: boolean;
  useCustomBackgroundColor: boolean;
  useCustomBorderColor: boolean;
};

export const PROFILE_CUSTOMIZATION_USER_SELECT = {
  profileBannerUrl: true,
  profileBannerMediaType: true,
  profileBannerModerationStatus: true,
  profileBackgroundId: true,
  profileBackgroundColor: true,
  profileFrameId: true,
  profileFrameColor: true,
  profileAccentColor: true,
  profileThemeId: true,
  profileThemeColor: true,
  profileBorderId: true,
  profileBorderColor: true,
  profileShowPlanBadge: true,
  profileShowAchievements: true,
  avatarMediaType: true,
  avatarModerationStatus: true,
  plan: true,
  isAdmin: true,
} as const;

type CustomizationUserFields = Pick<User, keyof typeof PROFILE_CUSTOMIZATION_USER_SELECT>;

export type ClientPlan = "free" | "premium" | "elite";

export function planToClientPlan(plan: Plan): ClientPlan {
  switch (plan) {
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

export function resolvePublicCustomization(
  plan: ClientPlan | Plan,
  fields: ProfileCustomizationState,
  options?: { isAdmin?: boolean },
): PublicProfileCustomization | null {
  const isElite = plan === "ELITE" || plan === "elite";
  if (!isElite) return null;

  const isAdmin = options?.isAdmin ?? false;
  const background = resolveBackgroundStyles(
    fields.profileBackgroundId,
    fields.profileBackgroundColor,
  );
  const theme = resolveThemeStyles(fields.profileThemeId, fields.profileThemeColor);
  const border = resolveBorderCardClass(fields.profileBorderId, fields.profileBorderColor);
  const avatarBorder = resolveAvatarBorderStyles(
    fields.profileFrameId,
    fields.profileBorderId,
    {
      frameColor: fields.profileFrameColor,
      borderColor: fields.profileBorderColor,
      isAdmin,
    },
  );

  return {
    ...fields,
    backgroundClass: background.backgroundClass,
    frameRingClass: avatarBorder.ringClass,
    frameGlowClass: avatarBorder.glowClass,
    frameGlowShadow: avatarBorder.glowShadow,
    frameIsRainbow: avatarBorder.isRainbow,
    frameOverlayUrl: avatarBorder.frameOverlayUrl,
    frameOverlayLayout: avatarBorder.frameOverlayLayout,
    frameOverlayHoleRatio: avatarBorder.frameOverlayHoleRatio,
    frameOverlayCorner: avatarBorder.frameOverlayCorner,
    frameOverlayCornerScale: avatarBorder.frameOverlayCornerScale,
    frameOverlayBlendMode: avatarBorder.frameOverlayBlendMode,
    themeHeroGradient: theme.heroGradient,
    themeGlowColor: theme.glowColor,
    borderCardClass: border.cardClass,
    accentColor: fields.profileAccentColor,
    styleVars: buildProfileStyleVars(fields),
    useCustomThemeColor: theme.useCustomThemeColor,
    useCustomBackgroundColor: background.useCustomBackgroundColor,
    useCustomBorderColor: border.useCustomBorderColor,
  };
}

export function serializeProfileCustomization(
  user: CustomizationUserFields,
): PublicProfileCustomization | null {
  if (user.plan !== "ELITE") return null;

  return resolvePublicCustomization(
    user.plan,
    {
      profileBannerUrl: user.profileBannerUrl,
      profileBannerMediaType: user.profileBannerMediaType,
      profileBannerModerationStatus: user.profileBannerModerationStatus,
      profileBackgroundId: user.profileBackgroundId,
      profileBackgroundColor: user.profileBackgroundColor,
      profileFrameId: user.profileFrameId,
      profileFrameColor: user.profileFrameColor,
      profileAccentColor: user.profileAccentColor,
      profileThemeId: user.profileThemeId,
      profileThemeColor: user.profileThemeColor,
      profileBorderId: user.profileBorderId,
      profileBorderColor: user.profileBorderColor,
      profileShowPlanBadge: user.profileShowPlanBadge,
      profileShowAchievements: user.profileShowAchievements,
      avatarMediaType: user.avatarMediaType,
      avatarModerationStatus: user.avatarModerationStatus,
    },
    { isAdmin: user.isAdmin },
  );
}

export function serializeOwnerCustomization(user: CustomizationUserFields): {
  isElite: boolean;
  isAdmin: boolean;
  customization: PublicProfileCustomization | null;
} {
  return {
    isElite: user.plan === "ELITE",
    isAdmin: user.isAdmin,
    customization: serializeProfileCustomization(user),
  };
}

export function extractCustomizationState(
  customization: PublicProfileCustomization | null,
): ProfileCustomizationState | null {
  if (!customization) return null;
  return {
    profileBannerUrl: customization.profileBannerUrl,
    profileBannerMediaType: customization.profileBannerMediaType,
    profileBannerModerationStatus: customization.profileBannerModerationStatus,
    profileBackgroundId: customization.profileBackgroundId,
    profileBackgroundColor: customization.profileBackgroundColor,
    profileFrameId: customization.profileFrameId,
    profileFrameColor: customization.profileFrameColor,
    profileAccentColor: customization.profileAccentColor,
    profileThemeId: customization.profileThemeId,
    profileThemeColor: customization.profileThemeColor,
    profileBorderId: customization.profileBorderId,
    profileBorderColor: customization.profileBorderColor,
    profileShowPlanBadge: customization.profileShowPlanBadge,
    profileShowAchievements: customization.profileShowAchievements,
    avatarMediaType: customization.avatarMediaType,
    avatarModerationStatus: customization.avatarModerationStatus,
  };
}
