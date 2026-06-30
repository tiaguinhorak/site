import type { User, Plan } from "@/lib/generated/prisma/client";
import { getAvatarInitials } from "@/lib/profile";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { getLevelProgress } from "@/lib/progression/xp-curve";

export type UserProfile = {
  id: string;
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  bio: string;
  avatarInitials: string;
  avatarUrl: string | null;
  customAvatarUrl: string | null;
  avatarPreset: string | null;
  avatarSource: "preset" | "custom" | "steam" | "initials";
  plan: "free" | "premium" | "elite";
  rank: number;
  elo: number;
  kd: number;
  matches: number;
  winRate: number;
  hoursPlayed: number;
  competitivePoints: number;
  rankedWins: number;
  rankedLosses: number;
  rankedKills: number;
  rankedDeaths: number;
  rankedAssists: number;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  xpToNext: number;
  levelProgress: number;
  isMaxLevel: boolean;
  coins: number;
  lifetimeCoins: number;
  anticheatInstalled: boolean;
  steamLinked: boolean;
  steamId: string | null;
  steamPersonaName: string | null;
  steamAvatarUrl: string | null;
  steamProfileUrl: string | null;
  steamCountryCode: string | null;
  steamLinkedAt: string | null;
  mfaEnabled: boolean;
  isAdmin: boolean;
};

function planToClient(plan: Plan): UserProfile["plan"] {
  switch (plan) {
    case "FREE":
      return "free";
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

export function serializeUser(user: User): UserProfile {
  const customAvatarUrl = user.avatarUrl;
  const resolved = resolveUserAvatarUrl(user);
  const levelSnapshot = getLevelProgress(user.xp);
  const avatarSource: UserProfile["avatarSource"] = user.avatarPreset
    ? "preset"
    : user.avatarUrl
      ? "custom"
      : user.steamAvatarUrl
        ? "steam"
        : "preset";

  return {
    id: user.id,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email ?? "",
    phone: user.phone,
    country: user.country,
    bio: user.bio,
    avatarInitials: getAvatarInitials(
      user.firstName,
      user.lastName,
      user.nickname,
    ),
    avatarUrl: resolved,
    customAvatarUrl,
    avatarPreset: user.avatarPreset,
    avatarSource,
    plan: planToClient(user.plan),
    rank: user.rank,
    elo: user.elo,
    kd: user.kd,
    matches: user.matches,
    winRate: user.winRate,
    hoursPlayed: user.hoursPlayed,
    competitivePoints: user.competitivePoints,
    rankedWins: user.rankedWins,
    rankedLosses: user.rankedLosses,
    rankedKills: user.rankedKills,
    rankedDeaths: user.rankedDeaths,
    rankedAssists: user.rankedAssists,
    xp: user.xp,
    level: levelSnapshot.level,
    xpIntoLevel: levelSnapshot.xpIntoLevel,
    xpForLevel: levelSnapshot.xpForLevel,
    xpToNext: levelSnapshot.xpToNext,
    levelProgress: levelSnapshot.progress,
    isMaxLevel: levelSnapshot.isMaxLevel,
    coins: user.coins,
    lifetimeCoins: user.lifetimeCoins,
    anticheatInstalled: user.anticheatInstalled,
    steamLinked: Boolean(user.steamId),
    steamId: user.steamId,
    steamPersonaName: user.steamPersonaName,
    steamAvatarUrl: user.steamAvatarUrl,
    steamProfileUrl: user.steamProfileUrl,
    steamCountryCode: user.steamCountryCode,
    steamLinkedAt: user.steamLinkedAt?.toISOString() ?? null,
    mfaEnabled: user.mfaEnabled,
    isAdmin: user.isAdmin,
  };
}

export function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
