import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { serializeProfileCustomization } from "@/lib/profile/serialize-customization";
import type { SerializedSocialUser } from "@/lib/profile/social-user";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

/** Select compartilhado para avatar + nome Steam + customização em toda a plataforma. */
export const SOCIAL_USER_SELECT = {
  id: true,
  ...STEAM_DISPLAY_NAME_SELECT,
  country: true,
  avatarUrl: true,
  avatarPreset: true,
  steamAvatarUrl: true,
  plan: true,
  level: true,
  elo: true,
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
  isAdmin: true,
} satisfies Prisma.UserSelect;

export type SocialUserDbRow = Prisma.UserGetPayload<{ select: typeof SOCIAL_USER_SELECT }>;

export function serializeSocialUser(user: SocialUserDbRow): SerializedSocialUser {
  return {
    userId: user.id,
    nickname: user.nickname,
    displayName: resolveSteamDisplayName(user),
    steamId: user.steamId,
    steamPersonaName: user.steamPersonaName,
    country: user.country,
    avatarUrl: resolveUserAvatarUrl(user),
    plan: user.plan.toLowerCase(),
    level: user.level,
    elo: user.elo,
    customization: serializeProfileCustomization(user),
  };
}
