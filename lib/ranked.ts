import type { UserProfile } from "@/lib/serializers";

export const RANKED_TEAM_SIZE = 5;
export const RANKED_MATCH_SIZE = RANKED_TEAM_SIZE * 2;

/** Reativar quando o cliente anticheat estiver disponível para download/login. */
export const RANKED_ANTICHEAT_REQUIRED = false;

export type RankedRequirement = "steam" | "subscription" | "anticheat";

export function hasRankedSubscription(plan: UserProfile["plan"]): boolean {
  return plan === "premium" || plan === "elite";
}

export function getRankedRequirements(user: UserProfile | null): RankedRequirement[] {
  const base: RankedRequirement[] = ["steam", "subscription"];
  if (RANKED_ANTICHEAT_REQUIRED) base.push("anticheat");
  if (!user) return base;

  const missing: RankedRequirement[] = [];
  if (!user.steamLinked) missing.push("steam");
  if (!hasRankedSubscription(user.plan)) missing.push("subscription");
  if (RANKED_ANTICHEAT_REQUIRED && !user.anticheatInstalled) missing.push("anticheat");
  return missing;
}

export function canJoinRankedQueue(
  user: UserProfile | null,
  options?: { queueRestricted?: boolean },
): boolean {
  if (options?.queueRestricted) return false;
  return getRankedRequirements(user).length === 0;
}

export type RankedQueuePlayer = {
  id: string;
  nickname: string;
  elo: number;
  avatarUrl: string | null;
  avatarInitials: string;
  isYou?: boolean;
};
