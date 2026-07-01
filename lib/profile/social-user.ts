import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import { resolveSteamDisplayName, type SteamDisplayNameUser } from "@/lib/steam/display-name";

/** Campos mínimos para exibir identidade pública consistente em toda a plataforma. */
export type SocialUserFields = SteamDisplayNameUser & {
  displayName?: string;
  plan?: string;
  customization?: PublicProfileCustomization | null;
};

export function resolveSocialDisplayName(user: SocialUserFields): string {
  if (user.displayName?.trim()) return user.displayName.trim();
  return resolveSteamDisplayName(user);
}

export function normalizeSocialPlan(plan?: string): "free" | "premium" | "elite" {
  if (plan === "premium" || plan === "PREMIUM") return "premium";
  if (plan === "elite" || plan === "ELITE") return "elite";
  return "free";
}
