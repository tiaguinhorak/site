import { getSessionUserIdFromCookies } from "@/lib/auth/session-user";
import { fetchLeaderboardPage } from "@/lib/leaderboard/queries";
import { getRankingBoardLabels } from "@/lib/ranking/ranking-board-labels";
import { getRankingScoringLabels } from "@/lib/ranking/ranking-scoring-labels";
import {
  getPublicActiveSeasonSummary,
  listPublicRankedSeasons,
  type PublicRankedSeasonOption,
} from "@/lib/ranked/season-service";
import type { PublicSeasonPrizeDisplay } from "@/lib/ranked/season-prize-display";
import { getPublicSeasonPrizesBySeasonIds } from "@/lib/ranked/season-prize-display";
import type { LeaderboardPageResult } from "@/lib/leaderboard/types";
import type { RankingBoardLabels } from "@/lib/ranking/ranking-board-labels";
import type { RankingScoringHintLabels } from "@/components/ranking/ranking-scoring-hint-client";

export type RankingSeasonSummary = NonNullable<
  Awaited<ReturnType<typeof getPublicActiveSeasonSummary>>
>;

export type RankingBootstrapPayload = {
  labels: RankingBoardLabels;
  seasons: PublicRankedSeasonOption[];
  seasonSummary: RankingSeasonSummary | null;
  scoringLabels: RankingScoringHintLabels;
  initialData: LeaderboardPageResult;
  defaultSeasonId: string | null;
  prizesBySeasonId: Record<string, PublicSeasonPrizeDisplay[]>;
};

export async function buildRankingBootstrap(): Promise<RankingBootstrapPayload> {
  const userId = await getSessionUserIdFromCookies();

  const [labels, seasons, seasonSummary, scoringLabels] = await Promise.all([
    getRankingBoardLabels(),
    listPublicRankedSeasons(),
    getPublicActiveSeasonSummary(),
    getRankingScoringLabels(),
  ]);

  const activeSeason = seasons.find((season) => season.active) ?? null;
  const activeSeasonId = activeSeason?.id ?? null;

  const [initialData, prizesBySeasonId] = await Promise.all([
    fetchLeaderboardPage({
      page: 1,
      limit: 25,
      sort: "points",
      userId,
      seasonId: activeSeasonId,
      activeSeasonId,
      seasonMeta: activeSeason
        ? {
            id: activeSeason.id,
            name: activeSeason.name,
            seasonNumber: activeSeason.seasonNumber,
            active: activeSeason.active,
            archived: activeSeason.archived,
          }
        : null,
    }),
    getPublicSeasonPrizesBySeasonIds(seasons.map((season) => season.id)),
  ]);

  return {
    labels,
    seasons,
    seasonSummary,
    scoringLabels,
    initialData,
    defaultSeasonId: activeSeasonId,
    prizesBySeasonId,
  };
}
