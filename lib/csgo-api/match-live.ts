import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";

export type CsgoMatchLiveView = {
  scoreTeamA: number;
  scoreTeamB: number;
  scoreCt: number;
  scoreT: number;
  round: number;
  phase: string;
  winner: string;
  finishedAt: number;
  updatedAt: number;
};

export async function fetchCsgoMatchLive(
  csgoMatchId: string,
): Promise<CsgoMatchLiveView | null> {
  try {
    const data = await csgoBackendFetch<{
      live: CsgoMatchLiveView | null;
    }>(`/api/matches/${csgoMatchId}/live`);
    return data.live ?? null;
  } catch {
    return null;
  }
}
