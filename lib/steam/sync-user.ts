import type { User } from "@/lib/generated/prisma/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import { countryCodes } from "@/lib/profile/countries";

export type SteamProfileData = {
  steamId: string;
  personaName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  realName: string | null;
  countryCode: string | null;
  accountCreatedAt: Date | null;
};

const STEAM_COUNTRY_MAP: Record<string, string> = Object.fromEntries(
  countryCodes.map((code) => [code, code]),
);

export function mapSteamCountry(code: string | null): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return STEAM_COUNTRY_MAP[upper] ?? "BR";
}

function splitPersonName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

type UserProfileFields = Pick<
  User,
  | "avatarUrl"
  | "avatarPreset"
  | "steamId"
  | "steamAvatarUrl"
  | "firstName"
  | "lastName"
  | "country"
>;

export function buildUserSteamUpdate(
  user: UserProfileFields | null,
  steam: SteamProfileData,
  options: { isNewUser?: boolean } = {},
): Prisma.UserUpdateInput {
  const update: Prisma.UserUpdateInput = {
    steamId: steam.steamId,
    steamPersonaName: steam.personaName,
    steamAvatarUrl: steam.avatarUrl,
    steamProfileUrl: steam.profileUrl,
    steamCountryCode: steam.countryCode,
  };

  if (!user?.steamId) {
    update.steamLinkedAt = new Date();
  }

  if (steam.accountCreatedAt) {
    update.steamAccountCreatedAt = steam.accountCreatedAt;
  }

  const usingSteamAvatar =
    !user?.avatarUrl && !user?.avatarPreset;
  if (usingSteamAvatar && steam.avatarUrl) {
    update.avatarUrl = steam.avatarUrl;
  }

  const displayName = steam.realName?.trim() || steam.personaName.trim();
  if (user && !user.firstName.trim() && displayName) {
    const { firstName, lastName } = splitPersonName(displayName);
    if (firstName) update.firstName = firstName;
    if (!user.lastName.trim() && lastName) update.lastName = lastName;
  }

  const mappedCountry = mapSteamCountry(steam.countryCode);
  if (options.isNewUser && mappedCountry) {
    update.country = mappedCountry;
  }

  return update;
}

export function buildUserSteamCreate(
  steam: SteamProfileData,
  nickname: string,
): Prisma.UserCreateInput {
  return {
    steamId: steam.steamId,
    steamPersonaName: steam.personaName,
    steamAvatarUrl: steam.avatarUrl,
    steamProfileUrl: steam.profileUrl,
    steamCountryCode: steam.countryCode,
    nickname,
    avatarUrl: steam.avatarUrl,
    firstName: "",
    lastName: "",
    country: mapSteamCountry(steam.countryCode) ?? "BR",
    steamLinkedAt: new Date(),
    steamAccountCreatedAt: steam.accountCreatedAt,
  };
}

export function buildUserSteamUnlink(
  user: Pick<User, "avatarUrl" | "avatarPreset" | "steamAvatarUrl">,
): Prisma.UserUpdateInput {
  const update: Prisma.UserUpdateInput = {
    steamId: null,
    steamPersonaName: null,
    steamAvatarUrl: null,
    steamProfileUrl: null,
    steamCountryCode: null,
    steamLinkedAt: null,
  };

  if (!user.avatarPreset && user.avatarUrl && user.avatarUrl === user.steamAvatarUrl) {
    update.avatarUrl = null;
  }

  return update;
}
