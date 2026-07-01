import type { SteamProfileData } from "@/lib/steam/sync-user";
import { getSteamApiKey } from "@/lib/steam/api-key";
import { fetchWithTimeout } from "@/lib/steam/fetch-with-timeout";
import { normalizeSteamId64 } from "@/lib/steam/steam-id";

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

export type SteamSummaryFetchMeta = {
  httpStatus: number | null;
  requested: number;
  returned: number;
  error: string | null;
};

const STEAM_SUMMARY_BATCH_SIZE = 100;
const PROBE_STEAM_ID = "76561197960287930";

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

function aliasRequestedIds(
  result: Map<string, SteamProfileData>,
  steamIds: string[],
): void {
  for (const requestedId of steamIds) {
    if (result.has(requestedId)) continue;
    const normalized = normalizeSteamId64(requestedId);
    if (normalized && result.has(normalized)) {
      result.set(requestedId, result.get(normalized)!);
    }
  }
}

async function fetchSteamPlayerSummaryBatch(
  steamIds: string[],
  apiKey: string,
): Promise<{ profiles: Map<string, SteamProfileData>; meta: SteamSummaryFetchMeta }> {
  const profiles = new Map<string, SteamProfileData>();
  const meta: SteamSummaryFetchMeta = {
    httpStatus: null,
    requested: steamIds.length,
    returned: 0,
    error: null,
  };

  if (steamIds.length === 0) return { profiles, meta };

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamIds.join(","));

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), { cache: "no-store" }, 12_000);
  } catch (error) {
    meta.error = error instanceof Error ? error.message : String(error);
    return { profiles, meta };
  }

  meta.httpStatus = response.status;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    meta.error = body.trim() || `HTTP ${response.status}`;
    console.error(
      `[steam/profile] GetPlayerSummaries failed: HTTP ${response.status}`,
      meta.error.slice(0, 200),
    );
    return { profiles, meta };
  }

  const data = (await response.json()) as {
    response?: { players?: SteamPlayerSummary[] };
  };

  for (const player of data.response?.players ?? []) {
    profiles.set(player.steamid, mapSteamPlayer(player));
  }

  aliasRequestedIds(profiles, steamIds);
  meta.returned = profiles.size;
  return { profiles, meta };
}

export async function probeSteamPlayerSummariesApi(): Promise<{
  ok: boolean;
  apiKeyPresent: boolean;
  httpStatus: number | null;
  playerCount: number;
  error: string | null;
}> {
  const apiKey = getSteamApiKey();
  if (!apiKey) {
    return {
      ok: false,
      apiKeyPresent: false,
      httpStatus: null,
      playerCount: 0,
      error: "STEAM_API_KEY ausente",
    };
  }

  const { profiles, meta } = await fetchSteamPlayerSummaryBatch([PROBE_STEAM_ID], apiKey);
  const ok = meta.httpStatus === 200 && profiles.size > 0;

  return {
    ok,
    apiKeyPresent: true,
    httpStatus: meta.httpStatus,
    playerCount: profiles.size,
    error: ok ? null : meta.error ?? "API não retornou jogadores (chave inválida?)",
  };
}

export async function fetchSteamPlayerSummary(
  steamId: string,
): Promise<SteamProfileData | null> {
  const normalized = normalizeSteamId64(steamId) ?? steamId;
  const map = await fetchSteamPlayerSummaries([normalized]);
  return map.get(normalized) ?? map.get(steamId) ?? null;
}

export async function fetchSteamPlayerSummaries(
  steamIds: string[],
): Promise<Map<string, SteamProfileData>> {
  const apiKey = getSteamApiKey();
  const result = new Map<string, SteamProfileData>();
  if (!apiKey) {
    console.warn("STEAM_API_KEY not set — Steam profile fetch skipped.");
    return result;
  }

  const unique = [
    ...new Set(
      steamIds
        .map((id) => normalizeSteamId64(id.trim()) ?? id.trim())
        .filter(Boolean),
    ),
  ];

  for (let i = 0; i < unique.length; i += STEAM_SUMMARY_BATCH_SIZE) {
    const chunk = unique.slice(i, i + STEAM_SUMMARY_BATCH_SIZE);
    const { profiles } = await fetchSteamPlayerSummaryBatch(chunk, apiKey);
    for (const [id, profile] of profiles) {
      result.set(id, profile);
    }
  }

  return result;
}

export async function fetchSteamPlayerSummariesWithMeta(
  steamIds: string[],
): Promise<{ profiles: Map<string, SteamProfileData>; meta: SteamSummaryFetchMeta }> {
  const apiKey = getSteamApiKey();
  const emptyMeta: SteamSummaryFetchMeta = {
    httpStatus: null,
    requested: steamIds.length,
    returned: 0,
    error: apiKey ? null : "STEAM_API_KEY ausente",
  };

  if (!apiKey) {
    return { profiles: new Map(), meta: emptyMeta };
  }

  const unique = [
    ...new Set(
      steamIds
        .map((id) => normalizeSteamId64(id.trim()) ?? id.trim())
        .filter(Boolean),
    ),
  ];

  const profiles = new Map<string, SteamProfileData>();
  let lastMeta: SteamSummaryFetchMeta = { ...emptyMeta, requested: unique.length };

  for (let i = 0; i < unique.length; i += STEAM_SUMMARY_BATCH_SIZE) {
    const chunk = unique.slice(i, i + STEAM_SUMMARY_BATCH_SIZE);
    const batch = await fetchSteamPlayerSummaryBatch(chunk, apiKey);
    lastMeta = batch.meta;
    for (const [id, profile] of batch.profiles) {
      profiles.set(id, profile);
    }
  }

  return { profiles, meta: { ...lastMeta, returned: profiles.size } };
}
