import "server-only";

import { GameDig } from "gamedig";
import { cached } from "@/lib/csgo-api/request-cache";
import { formatMapLabel } from "@/lib/servers/maps";

const LIVE_QUERY_TTL_MS = 12_000;

export type LiveServerQueryResult = {
  host: string;
  port: number;
  online: boolean;
  hostname: string | null;
  map: string;
  mapRaw: string | null;
  players: number;
  slots: number;
  bots: number;
  ping: number;
};

function offlineResult(host: string, port: number): LiveServerQueryResult {
  return {
    host,
    port,
    online: false,
    hostname: null,
    map: "Offline",
    mapRaw: null,
    players: 0,
    slots: 0,
    bots: 0,
    ping: 0,
  };
}

async function queryCsgoServerLiveUncached(
  host: string,
  port: number,
): Promise<LiveServerQueryResult> {
  try {
    const result = await GameDig.query({
      type: "csgo",
      host,
      port,
      maxAttempts: 1,
      socketTimeout: 3000,
    });

    const mapRaw = result.map ?? null;

    return {
      host,
      port,
      online: true,
      hostname: result.name ?? null,
      map: formatMapLabel(mapRaw),
      mapRaw,
      players: result.numplayers ?? 0,
      slots: result.maxplayers ?? 10,
      bots: result.raw?.numbots ?? 0,
      ping: Math.round(result.ping ?? 0),
    };
  } catch {
    return offlineResult(host, port);
  }
}

export async function queryCsgoServerLive(
  host: string,
  port: number,
): Promise<LiveServerQueryResult> {
  return cached(`a2s:${host}:${port}`, LIVE_QUERY_TTL_MS, () =>
    queryCsgoServerLiveUncached(host, port),
  );
}

export async function queryCsgoServersLive(
  targets: { host: string; port: number }[],
): Promise<Map<string, LiveServerQueryResult>> {
  if (targets.length === 0) return new Map();

  const unique = new Map<string, { host: string; port: number }>();
  for (const target of targets) {
    unique.set(`${target.host}:${target.port}`, target);
  }

  const results = await Promise.all(
    [...unique.values()].map(({ host, port }) => queryCsgoServerLive(host, port)),
  );

  return new Map(results.map((row) => [`${row.host}:${row.port}`, row]));
}

/** Força nova query A2S (ex.: após subir/derrubar servidor). */
export async function refreshCsgoServerLive(
  host: string,
  port: number,
): Promise<LiveServerQueryResult> {
  const { invalidateCache } = await import("@/lib/csgo-api/request-cache");
  invalidateCache(`a2s:${host}:${port}`);
  return queryCsgoServerLiveUncached(host, port);
}
