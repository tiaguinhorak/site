import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import { queryCsgoServerLive } from "@/lib/csgo-api/query-live-server";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";

export function isServerFree(server: CsgoGameServer): boolean {
  return !server.currentMatchId && server.status !== "busy";
}

export function isRankedPoolServer(server: CsgoGameServer): boolean {
  const pool = server.pool ?? "ranked";
  return pool === "ranked";
}

export function isServerOnline(server: CsgoGameServer): boolean {
  return server.status === "online" || server.status === "busy";
}

/** Prefer idle online servers; then idle offline (candidate to boot). */
export function rankServersForMatch(servers: CsgoGameServer[]): CsgoGameServer[] {
  const free = servers.filter((s) => isServerFree(s) && isRankedPoolServer(s));
  const online = free.filter((s) => s.status === "online");
  const offline = free.filter((s) => s.status === "offline");
  return [...online, ...offline];
}

export async function listCsgoGameServers(): Promise<CsgoGameServer[]> {
  try {
    return await csgoBackendFetch<CsgoGameServer[]>("/api/servers");
  } catch {
    return [];
  }
}

export async function pickBestServerForMatch(
  preferredServerId?: string | null,
): Promise<CsgoGameServer | null> {
  const servers = await listCsgoGameServers();
  if (!servers.length) return null;

  if (preferredServerId) {
    const preferred = servers.find((s) => s.id === preferredServerId);
    if (preferred && isServerFree(preferred)) return preferred;
  }

  const ranked = rankServersForMatch(servers);
  if (!ranked.length) return null;

  const firstOnline = ranked.find((s) => s.status === "online");
  if (firstOnline) return firstOnline;

  return ranked[0] ?? null;
}

export async function verifyServerReachable(server: CsgoGameServer): Promise<boolean> {
  if (server.status === "online") return true;
  const live = await queryCsgoServerLive(server.host, server.port);
  return live.online;
}
