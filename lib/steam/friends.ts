import "server-only";

import { getSteamApiKey } from "@/lib/steam/api-key";

type SteamFriend = { steamid: string; relationship: string; friend_since: number };

/**
 * Fetch the SteamID64 list of a user's Steam friends.
 * Requires the user's friend list to be public and STEAM_API_KEY to be set.
 * Returns an empty array when unavailable (private list, no key, errors).
 */
export async function fetchSteamFriendIds(steamId: string): Promise<string[]> {
  const apiKey = getSteamApiKey();
  if (!apiKey || !steamId) return [];

  const url = new URL("https://api.steampowered.com/ISteamUser/GetFriendList/v0001/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("relationship", "friend");

  try {
    const response = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      friendslist?: { friends?: SteamFriend[] };
    };
    return (data.friendslist?.friends ?? []).map((f) => f.steamid).filter(Boolean);
  } catch {
    return [];
  }
}

/** Resolve a Steam vanity URL (custom id) to a SteamID64. */
export async function resolveSteamVanity(vanity: string): Promise<string | null> {
  const apiKey = getSteamApiKey();
  if (!apiKey || !vanity) return null;

  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("vanityurl", vanity);

  try {
    const response = await fetch(url.toString(), { next: { revalidate: 600 } });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      response?: { success?: number; steamid?: string };
    };
    if (data.response?.success === 1 && data.response.steamid) {
      return data.response.steamid;
    }
    return null;
  } catch {
    return null;
  }
}

const STEAMID64_REGEX = /^\d{17}$/;

/**
 * Resolve a SteamID64 from a raw id, a profiles URL, or a vanity URL.
 * Returns null when it cannot be resolved.
 */
export async function resolveSteamId64(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (STEAMID64_REGEX.test(trimmed)) return trimmed;

  const profilesMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profilesMatch) return profilesMatch[1];

  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch) {
    return resolveSteamVanity(decodeURIComponent(vanityMatch[1]));
  }

  // Bare vanity handle (no URL).
  if (/^[A-Za-z0-9_-]{2,32}$/.test(trimmed)) {
    return resolveSteamVanity(trimmed);
  }

  return null;
}
