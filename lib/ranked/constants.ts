export const RANKED_MAP_POOL = [
  "de_mirage",
  "de_inferno",
  "de_dust2",
  "de_nuke",
  "de_overpass",
  "de_ancient",
  "de_anubis",
  "de_vertigo",
] as const;

export const RANKED_MAP_LABELS: Record<(typeof RANKED_MAP_POOL)[number], string> = {
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_dust2: "Dust II",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_vertigo: "Vertigo",
};

export const RANKED_MAP_POOL_MIN = 3;

export const RANKED_CHALLENGE_TTL_MS = 60_000;
export const RANKED_ACCEPT_TTL_MS = 90_000;
export const RANKED_VOTE_SECONDS = 30;

export const RANKED_MATCH_CONFIG = {
  gameType: 0,
  gameMode: 1,
  tickrate: 128,
  maxRounds: 30,
  overtimeRounds: 6,
} as const;
