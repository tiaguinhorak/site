import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import type { CsgoMatchSummary } from "@/lib/csgo-api/server-types";

const STALE_STATUSES = ["waiting_players", "veto", "ready"] as const;

export async function cancelStaleCsgoMatches(
  statuses: readonly string[] = STALE_STATUSES,
): Promise<number> {
  let cancelled = 0;

  for (const status of statuses) {
    let matches: CsgoMatchSummary[] = [];
    try {
      matches = await csgoBackendFetch<CsgoMatchSummary[]>(`/api/matches?status=${status}`);
    } catch {
      continue;
    }

    for (const match of matches) {
      try {
        await csgoBackendFetch(`/api/matches/${match.id}/cancel`, { method: "POST" });
        cancelled += 1;
      } catch {
        /* ignore individual failures */
      }
    }
  }

  return cancelled;
}

export async function cancelCsgoMatchIfActive(csgoMatchId: string): Promise<void> {
  try {
    const match = await csgoBackendFetch<CsgoMatchSummary>(`/api/matches/${csgoMatchId}`);
    if (["finished", "cancelled"].includes(match.status)) return;
    await csgoBackendFetch(`/api/matches/${csgoMatchId}/cancel`, { method: "POST" });
  } catch {
    /* ignore */
  }
}

const ACTIVE_CSgo_MATCH_STATUSES = ["waiting_players", "veto", "ready", "live"] as const;

/** Cancela partidas ativas na API com o mesmo roomId (evita duplicatas por poll). */
export async function cancelCsgoMatchesForRoom(
  roomId: string,
  keepMatchId?: string | null,
): Promise<number> {
  let cancelled = 0;

  for (const status of ACTIVE_CSgo_MATCH_STATUSES) {
    let matches: CsgoMatchSummary[] = [];
    try {
      matches = await csgoBackendFetch<CsgoMatchSummary[]>(`/api/matches?status=${status}`);
    } catch {
      continue;
    }

    for (const match of matches) {
      if (match.roomId !== roomId) continue;
      if (keepMatchId && match.id === keepMatchId) continue;
      try {
        await csgoBackendFetch(`/api/matches/${match.id}/cancel`, { method: "POST" });
        cancelled += 1;
      } catch {
        /* ignore */
      }
    }
  }

  return cancelled;
}
