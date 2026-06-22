import type { PickedMaps, VetoHistoryEntry } from "@/lib/csgo-api/schemas";
import { CsgoApiError } from "@/lib/csgo-api/http";

export const VETO_STEPS = [
  { team: "B" as const, action: "ban" as const, phase: "ban_b" },
  { team: "A" as const, action: "ban" as const, phase: "ban_a" },
  { team: "B" as const, action: "ban" as const, phase: "ban_b" },
  { team: "A" as const, action: "ban" as const, phase: "ban_a" },
  { team: "A" as const, action: "pick" as const, phase: "pick_a" },
  { team: "B" as const, action: "pick" as const, phase: "pick_b" },
  { team: "A" as const, action: "ban" as const, phase: "ban_a" },
  { team: "B" as const, action: "ban" as const, phase: "ban_b" },
];

export type VetoState = {
  history: VetoHistoryEntry[];
  currentStep: {
    phase: string;
    team: "A" | "B";
    action: "ban" | "pick";
    availableMaps: string[];
  } | null;
  availableMaps: string[];
  isComplete: boolean;
  selectedMap?: string;
  pickedMaps: PickedMaps;
};

function getAvailableMaps(mapPool: string[], history: VetoHistoryEntry[]): string[] {
  const banned = new Set(
    history.filter((h) => h.action === "ban").map((h) => h.map),
  );
  return mapPool.filter((m) => !banned.has(m));
}

export function buildVetoState(
  mapPool: string[],
  history: VetoHistoryEntry[],
  pickedMaps: PickedMaps,
): VetoState {
  const stepIndex = history.length;
  const availableMaps = getAvailableMaps(mapPool, history);
  const isComplete = stepIndex >= VETO_STEPS.length || availableMaps.length <= 1;

  let selectedMap: string | undefined;
  let finalPickedMaps = { ...pickedMaps };

  if (isComplete) {
    if (availableMaps.length === 1) {
      selectedMap = availableMaps[0];
    } else if (pickedMaps.map1) {
      selectedMap = pickedMaps.map1;
    } else if (availableMaps.length > 0) {
      selectedMap =
        availableMaps[Math.floor(Math.random() * availableMaps.length)];
    }
  }

  const currentStep =
    isComplete || stepIndex >= VETO_STEPS.length
      ? null
      : (() => {
          const step = VETO_STEPS[stepIndex]!;
          return {
            phase: step.phase,
            team: step.team,
            action: step.action,
            availableMaps: [...availableMaps],
          };
        })();

  return {
    history,
    currentStep,
    availableMaps,
    isComplete,
    selectedMap,
    pickedMaps: finalPickedMaps,
  };
}

export function applyVetoAction(
  mapPool: string[],
  history: VetoHistoryEntry[],
  pickedMaps: PickedMaps,
  input: { team: "A" | "B"; action: "ban" | "pick"; map: string },
): { history: VetoHistoryEntry[]; pickedMaps: PickedMaps; vetoState: VetoState } {
  const stepIndex = history.length;
  if (stepIndex >= VETO_STEPS.length) {
    throw new CsgoApiError("Veto já concluído.");
  }

  const step = VETO_STEPS[stepIndex]!;
  if (input.team !== step.team || input.action !== step.action) {
    throw new CsgoApiError(
      `Aguardando ${step.action} do time ${step.team}, recebido ${input.action} do time ${input.team}.`,
    );
  }

  const availableMaps = getAvailableMaps(mapPool, history);
  if (!availableMaps.includes(input.map)) {
    throw new CsgoApiError(`Mapa "${input.map}" não está disponível.`);
  }

  const entry: VetoHistoryEntry = {
    team: input.team,
    action: input.action,
    map: input.map,
    timestamp: new Date().toISOString(),
  };

  const newHistory = [...history, entry];
  const newPickedMaps = { ...pickedMaps };

  if (input.action === "pick") {
    if (step.phase === "pick_a") newPickedMaps.map1 = input.map;
    if (step.phase === "pick_b") newPickedMaps.map2 = input.map;
  }

  const vetoState = buildVetoState(mapPool, newHistory, newPickedMaps);

  return {
    history: newHistory,
    pickedMaps: vetoState.pickedMaps,
    vetoState,
  };
}
