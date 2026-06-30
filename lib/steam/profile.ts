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
  timecreated?: number;
};

const STEAM_SUMMARY_BATCH_SIZE = 100;

function mapSteamPlayer(player: SteamPlayerSummary): SteamProfileData {
  return {
    steamId: player.steamid,
    personaName:
      player.personaname?.trim() || `Player_${player.steamid.slice(-4)}`,
    avatarUrl: player.avatarfull || player.avatarmedium || player.avatar || null,
    profileUrl: player.profileurl || null,
    realName: player.realname?.trim() || null,
    countryCode: player.loccountrycode?.trim() || null,
    accountCreatedAt:
      player.timecreated && player.timecreated > 0
        ? new Date(player.timecreated * 1000)
        : null,
  };
}

async function fetchSteamPlayerSummaryBatch(
  steamIds: string[],
  apiKey: string,
): Promise<Map<string, SteamProfileData>> {
  const result = new Map<string, SteamProfileData>();
  if (steamIds.length === 0) return result;

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamIds.join(","));

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });
  if (!response.ok) return result;

  const data = (await response.json()) as {
    response?: { players?: SteamPlayerSummary[] };
  };

  for (const player of data.response?.players ?? []) {
    result.set(player.steamid, mapSteamPlayer(player));
  }

  return result;
}

export async function fetchSteamPlayerSummary(
  steamId: string,
): Promise<SteamProfileData | null> {
  const map = await fetchSteamPlayerSummaries([steamId]);
  return map.get(steamId) ?? null;
}

export async function fetchSteamPlayerSummaries(
  steamIds: string[],
): Promise<Map<string, SteamProfileData>> {
  const apiKey = process.env.STEAM_API_KEY;
  const result = new Map<string, SteamProfileData>();
  if (!apiKey) {
    console.warn("STEAM_API_KEY not set — Steam profile fetch skipped.");
    return result;
  }

  const unique = [...new Set(steamIds.map((id) => id.trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += STEAM_SUMMARY_BATCH_SIZE) {
    const chunk = unique.slice(i, i + STEAM_SUMMARY_BATCH_SIZE);
    const batch = await fetchSteamPlayerSummaryBatch(chunk, apiKey);
    for (const [id, profile] of batch) {
      result.set(id, profile);
    }
  }

  return result;
}
