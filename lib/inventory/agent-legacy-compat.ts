/** CS:GO Legacy agent def_index range (Shattered Web / Broken Fang / Riptide). */
export const LEGACY_MIN_AGENT_DEFINDEX = 4613;
export const LEGACY_MAX_AGENT_DEFINDEX = 5602;

export function isLegacyCompatibleAgent(defIndex: number): boolean {
  return (
    Number.isFinite(defIndex) &&
    defIndex >= LEGACY_MIN_AGENT_DEFINDEX &&
    defIndex <= LEGACY_MAX_AGENT_DEFINDEX
  );
}

/** Convert CSGO-API model_player (.vmdl) to CS:GO server .mdl path. */
export function agentModelPlayerToGamePath(modelPlayer: string | null | undefined): string | null {
  if (!modelPlayer?.trim()) return null;
  let path = modelPlayer.trim().replace(/\.vmdl$/i, ".mdl");
  if (path.startsWith("agents/models/")) {
    path = `models/player/custom_player/${path.slice("agents/models/".length)}`;
  }
  return path;
}
