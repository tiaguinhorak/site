import type { SteamProfileData } from "@/lib/steam/sync-user";

type SteamPlayerSummary = {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  realname?: string;
  loccountrycode?: string;
};

export async function fetchSteamPlayerSummary(
  steamId: string,
): Promise<SteamProfileData | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    console.warn("STEAM_API_KEY not set — Steam profile fetch skipped.");
    return null;
  }

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamId);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    response?: { players?: SteamPlayerSummary[] };
  };
  const player = data.response?.players?.[0];
  if (!player) return null;

  return {
    steamId: player.steamid,
    personaName:
      player.personaname?.trim() || `Player_${player.steamid.slice(-4)}`,
    avatarUrl: player.avatarfull || player.avatarmedium || player.avatar || null,
    profileUrl: player.profileurl || null,
    realName: player.realname?.trim() || null,
    countryCode: player.loccountrycode?.trim() || null,
  };
}
