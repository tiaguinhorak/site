import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { resolveSteamDisplayName, type SteamDisplayNameUser } from "@/lib/steam/display-name";

/** Campos mínimos para exibir identidade pública consistente em toda a plataforma. */
export type SocialUserFields = SteamDisplayNameUser & {
  displayName?: string;
  plan?: string;
  customization?: PublicProfileCustomization | null;
};

/** Usuário serializado com avatar/nome Steam — espelha lib/profile/serialize-social-user. */
export type SerializedSocialUser = {
  userId: string;
  nickname: string;
  displayName: string;
  steamId: string | null;
  steamPersonaName: string | null;
  country: string;
  avatarUrl: string | null;
  plan: string;
  level: number;
  elo: number;
  customization: PublicProfileCustomization | null;
};

/** Props normalizadas para SocialUserRow / SocialUserName (padrão global). */
export type SocialUserView = SocialUserFields & {
  avatarUrl: string | null;
  country?: string;
  level?: number;
  elo?: number;
};

export function toSocialUserView(user: SerializedSocialUser): SocialUserView {
  return {
    nickname: user.nickname,
    displayName: user.displayName,
    steamId: user.steamId,
    steamPersonaName: user.steamPersonaName,
    plan: user.plan,
    customization: user.customization,
    avatarUrl: user.avatarUrl,
    country: user.country,
    level: user.level,
    elo: user.elo,
  };
}

export function isSerializedSocialUser(
  user: SerializedSocialUser | SocialUserView,
): user is SerializedSocialUser {
  return "userId" in user;
}

export function normalizeSocialUser(
  user: SerializedSocialUser | SocialUserView,
): SocialUserView {
  return isSerializedSocialUser(user) ? toSocialUserView(user) : user;
}

export function resolveSocialDisplayName(user: SocialUserFields): string {
  if (user.displayName?.trim()) return user.displayName.trim();
  return resolveSteamDisplayName(user);
}

export function normalizeSocialPlan(plan?: string): "free" | "premium" | "elite" {
  if (plan === "premium" || plan === "PREMIUM") return "premium";
  if (plan === "elite" || plan === "ELITE") return "elite";
  return "free";
}
