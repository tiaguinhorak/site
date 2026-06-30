export type LeaderboardSort =
  | "points"
  | "elo"
  | "kd"
  | "wins"
  | "winRate"
  | "kills"
  | "assists"
  | "mvps"
  | "hs"
  | "clutch"
  | "utility"
  | "awp"
  | "level";

export type LeaderboardPlayer = {
  rank: number;
  nickname: string;
  country: string;
  avatarUrl: string | null;
  plan: "free" | "premium" | "elite";
  elo: number;
  kd: number;
  points: number;
  wins: number;
  losses: number;
  winRate: number;
  matches: number;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  headshots: number;
  clutches: number;
  utilityDamage: number;
  awpKills: number;
  level: number;
};

export type LeaderboardPageResult = {
  players: LeaderboardPlayer[];
  total: number;
  page: number;
  limit: number;
  sort: LeaderboardSort;
  you: LeaderboardPlayer | null;
};

export const LEADERBOARD_SORT_VALUES: LeaderboardSort[] = [
  "points",
  "elo",
  "kd",
  "wins",
  "winRate",
  "kills",
  "assists",
  "mvps",
  "hs",
  "clutch",
  "utility",
  "awp",
  "level",
];

export const LEADERBOARD_PAGE_SIZE = 25;

export type RankedMatchHistoryEntry = {
  id: string;
  sessionId: string;
  map: string | null;
  finishedAt: string | null;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  mvp: number;
  headshots: number;
  damage: number;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
  hasDemo: boolean;
  pointsDelta: number | null;
};
