import type {
  LeaderboardPageResult,
  LeaderboardPlayer,
  LeaderboardSort,
} from "@/lib/leaderboard/types";
import { LEADERBOARD_PAGE_SIZE } from "@/lib/leaderboard/types";

export type { LeaderboardPageResult, LeaderboardPlayer, LeaderboardSort };

export const LEADERBOARD_SCORING = {
  winPoints: 100,
  lossPoints: -15,
  killPoints: 2,
  deathPoints: -1,
  eloWin: 25,
  eloLoss: 20,
} as const;
