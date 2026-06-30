export type WarmupModeId = string;

export type WarmupModeDef = {
  id: WarmupModeId;
  slug: string;
  label: string;
  /** Matches PublicServer.mode (case-insensitive) */
  modeLabel: string;
  icon: string;
  accent: string;
  enabled?: boolean;
  maps?: string[];
};

export function normalizeModeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function serverMatchesWarmupMode(
  serverMode: string,
  mode: Pick<WarmupModeDef, "id" | "label" | "modeLabel">,
): boolean {
  const key = normalizeModeKey(serverMode);
  const target = normalizeModeKey(mode.modeLabel);
  if (key === target) return true;
  if (key === normalizeModeKey(mode.label)) return true;
  if (mode.id === "deathmatch" && key.includes("deathmatch")) return true;
  if (mode.id === "retake" && key.includes("retake")) return true;
  if (mode.id === "surf" && key.includes("surf")) return true;
  if (mode.id === "kz" && (key === "kz" || key.includes("climb"))) return true;
  if (mode.id === "warmup" && key.includes("warmup")) return true;
  return false;
}

export function findWarmupModeForServerMode(
  mode: string,
  modes: WarmupModeDef[],
): WarmupModeDef | undefined {
  return modes.find((entry) => serverMatchesWarmupMode(mode, entry));
}
