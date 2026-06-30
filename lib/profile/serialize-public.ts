import type { User } from "@/lib/generated/prisma/client";
import type { UserProfile } from "@/lib/serializers";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { getCountryFlag, getCountry } from "@/lib/profile/countries";
import {
  computeAdr,
  computeHsPct,
  formatMapLabel,
  formatWeaponLabel,
  topKeyFromCounts,
} from "@/lib/profile/player-advanced-stats";
import { getLevelProgress } from "@/lib/progression/xp-curve";

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
  competitivePoints: number;
  rankedWins: number;
  rankedLosses: number;
  rankedKills: number;
  rankedDeaths: number;
  rankedAssists: number;
  rankedMvps: number;
  rankedHeadshots: number;
  rankedDamage: number;
  rankedRoundsPlayed: number;
  rankedClutches: number;
  rankedUtilityDamage: number;
  rankedEnemiesFlashed: number;
  rankedAwpKills: number;
  hsPct: number;
  adr: number;
  level: number;
  xp: number;
  profileTag: string | null;
  profileMedalCode: string | null;
  favoriteWeapon: string | null;
  favoriteMap: string | null;
  steamPersonaName: string | null;
  steamProfileUrl: string | null;
  anticheatInstalled: boolean;
};

function planToClient(plan: User["plan"]): PublicPlayerProfile["plan"] {
  switch (plan) {
    case "PREMIUM":
      return "premium";
    case "ELITE":
      return "elite";
    default:
      return "free";
  }
}

function buildAdvancedFields(user: User): Pick<
  PublicPlayerProfile,
  | "rankedMvps"
  | "rankedHeadshots"
  | "rankedDamage"
  | "rankedRoundsPlayed"
  | "rankedClutches"
  | "rankedUtilityDamage"
  | "rankedEnemiesFlashed"
  | "rankedAwpKills"
  | "hsPct"
  | "adr"
  | "level"
  | "xp"
  | "profileTag"
  | "profileMedalCode"
  | "favoriteWeapon"
  | "favoriteMap"
> {
  const favWeaponKey = topKeyFromCounts(user.weaponKillCounts);
  const favMapKey = topKeyFromCounts(user.mapPlayCounts);
  const levelSnapshot = getLevelProgress(user.xp);

  return {
    rankedMvps: user.rankedMvps,
    rankedHeadshots: user.rankedHeadshots,
    rankedDamage: user.rankedDamage,
    rankedRoundsPlayed: user.rankedRoundsPlayed,
    rankedClutches: user.rankedClutches,
    rankedUtilityDamage: user.rankedUtilityDamage,
    rankedEnemiesFlashed: user.rankedEnemiesFlashed,
    rankedAwpKills: user.rankedAwpKills,
    hsPct: computeHsPct(user.rankedHeadshots, user.rankedKills),
    adr: computeAdr(user.rankedDamage, user.rankedRoundsPlayed),
    level: levelSnapshot.level,
    xp: user.xp,
    profileTag: user.profileTag,
    profileMedalCode: user.profileMedalCode,
    favoriteWeapon: favWeaponKey ? formatWeaponLabel(favWeaponKey) : null,
    favoriteMap: favMapKey ? formatMapLabel(favMapKey) : null,
  };
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
    competitivePoints: user.competitivePoints,
    rankedWins: user.rankedWins,
    rankedLosses: user.rankedLosses,
    rankedKills: user.rankedKills,
    rankedDeaths: user.rankedDeaths,
    rankedAssists: user.rankedAssists,
    rankedMvps: 0,
    rankedHeadshots: 0,
    rankedDamage: 0,
    rankedRoundsPlayed: 0,
    rankedClutches: 0,
    rankedUtilityDamage: 0,
    rankedEnemiesFlashed: 0,
    rankedAwpKills: 0,
    hsPct: computeHsPct(0, user.rankedKills),
    adr: 0,
    level: user.level,
    xp: user.xp,
    profileTag: null,
    profileMedalCode: null,
    favoriteWeapon: null,
    favoriteMap: null,
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
    competitivePoints: user.competitivePoints,
    rankedWins: user.rankedWins,
    rankedLosses: user.rankedLosses,
    rankedKills: user.rankedKills,
    rankedDeaths: user.rankedDeaths,
    rankedAssists: user.rankedAssists,
    steamPersonaName: user.steamPersonaName,
    steamProfileUrl: user.steamProfileUrl,
    anticheatInstalled: user.anticheatInstalled,
    ...buildAdvancedFields(user),
  };
}
