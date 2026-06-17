import type { User, Plan } from "@/lib/generated/prisma/client";
import type { UserProfile } from "@/lib/serializers";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { getCountryFlag, getCountry } from "@/lib/profile/countries";

export type PublicPlayerProfile = {
  nickname: string;
  bio: string;
  country: string;
  countryName: string;
  countryFlag: string;
  avatarUrl: string | null;
  plan: "free" | "premium" | "elite";
  rank: number;
  elo: number;
  kd: number;
  matches: number;
  winRate: number;
  hoursPlayed: number;
  steamPersonaName: string | null;
  steamProfileUrl: string | null;
  anticheatInstalled: boolean;
};

function planToClient(plan: Plan): PublicPlayerProfile["plan"] {
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

/** Converte perfil da sessão (cliente) para exibição pública ao vivo */
export function userProfileToPublic(user: UserProfile): PublicPlayerProfile {
  const countryMeta = getCountry(user.country);

  return {
    nickname: user.nickname,
    bio: user.bio,
    country: user.country,
    countryName: countryMeta?.name ?? user.country,
    countryFlag: getCountryFlag(user.country),
    avatarUrl: user.avatarUrl,
    plan: user.plan,
    rank: user.rank,
    elo: user.elo,
    kd: user.kd,
    matches: user.matches,
    winRate: user.winRate,
    hoursPlayed: user.hoursPlayed,
    steamPersonaName: user.steamPersonaName,
    steamProfileUrl: user.steamProfileUrl,
    anticheatInstalled: user.anticheatInstalled,
  };
}

/** Apenas dados públicos de jogo — sem email, telefone, nome real ou IDs internos */
export function serializePublicPlayer(user: User): PublicPlayerProfile {
  const countryMeta = getCountry(user.country);

  return {
    nickname: user.nickname,
    bio: user.bio,
    country: user.country,
    countryName: countryMeta?.name ?? user.country,
    countryFlag: getCountryFlag(user.country),
    avatarUrl: resolveUserAvatarUrl(user),
    plan: planToClient(user.plan),
    rank: user.rank,
    elo: user.elo,
    kd: user.kd,
    matches: user.matches,
    winRate: user.winRate,
    hoursPlayed: user.hoursPlayed,
    steamPersonaName: user.steamPersonaName,
    steamProfileUrl: user.steamProfileUrl,
    anticheatInstalled: user.anticheatInstalled,
  };
}
