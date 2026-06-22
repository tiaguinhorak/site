import "server-only";

import { csgoBackendFetch } from "@/lib/csgo-api/client";
import type { CsgoMatchSummary } from "@/lib/csgo-api/server-types";

type CsgoVetoState = {
  currentStep: {
    team: "A" | "B";
    action: "ban" | "pick";
    availableMaps: string[];
  } | null;
  isComplete: boolean;
};

function pickMapForStep(
  targetMap: string,
  action: "ban" | "pick",
  team: "A" | "B",
  availableMaps: string[],
): string {
  if (!availableMaps.length) {
    throw new Error("Nenhum mapa disponível no veto da API CS:GO.");
  }

  if (action === "pick" && team === "A") {
    return availableMaps.includes(targetMap) ? targetMap : availableMaps[0]!;
  }

  if (action === "pick") {
    return availableMaps.find((map) => map !== targetMap) ?? availableMaps[0]!;
  }

  return availableMaps.find((map) => map !== targetMap) ?? availableMaps[0]!;
}

/**
 * Conclui o veto na API CS:GO até o mapa eleito no site ficar em status `ready`.
 * A votação democrática roda no site; a API só precisa do mapa final para o start.
 */
export async function completeCsgoVetoForMap(
  csgoMatchId: string,
  targetMap: string,
): Promise<void> {
  let match = await csgoBackendFetch<CsgoMatchSummary>(`/api/matches/${csgoMatchId}`);

  if (match.status === "live") return;

  if (match.status === "ready" && match.selectedMap === targetMap) return;

  if (match.status === "waiting_players") {
    await csgoBackendFetch(`/api/matches/${csgoMatchId}/start-veto`, { method: "POST" });
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    match = await csgoBackendFetch<CsgoMatchSummary>(`/api/matches/${csgoMatchId}`);
    if (match.status === "ready" || match.status === "live") return;

    const state = await csgoBackendFetch<CsgoVetoState>(
      `/api/matches/${csgoMatchId}/veto-state`,
    );
    if (state.isComplete || !state.currentStep) break;

    const { team, action, availableMaps } = state.currentStep;
    const map = pickMapForStep(targetMap, action, team, availableMaps);

    await csgoBackendFetch(`/api/matches/${csgoMatchId}/veto`, {
      method: "POST",
      body: { team, action, map },
    });
  }

  match = await csgoBackendFetch<CsgoMatchSummary>(`/api/matches/${csgoMatchId}`);
  if (match.status !== "ready" && match.status !== "live") {
    throw new Error(
      "Não foi possível concluir o veto na API CS:GO. Cancele partidas antigas em Admin → Infra CS:GO.",
    );
  }
}
