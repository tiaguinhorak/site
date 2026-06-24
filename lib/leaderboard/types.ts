export type LeaderboardSort = "points" | "elo" | "kd" | "wins" | "winRate";

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
];

export const LEADERBOARD_PAGE_SIZE = 25;

export type RankedMatchHistoryEntry = {
  id: string;
  map: string | null;
  finishedAt: string | null;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  mvp: number;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
  pointsDelta: number | null;
};
