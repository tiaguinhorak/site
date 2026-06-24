import { prisma } from "@/lib/prisma";
import {
  LEADERBOARD_PARTICIPANT_WHERE,
  syncLeaderboardRanksWithClient,
} from "@/lib/leaderboard/sync-ranks-core";

export { LEADERBOARD_PARTICIPANT_WHERE };

export async function syncLeaderboardRanks(): Promise<number> {
  return syncLeaderboardRanksWithClient(prisma);
}
