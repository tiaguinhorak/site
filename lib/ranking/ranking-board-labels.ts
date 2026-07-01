import { getTranslations } from "next-intl/server";

export type RankingBoardLabels = {
  sortPoints: string;
  sortElo: string;
  sortKd: string;
  sortWins: string;
  sortWinRate: string;
  sortKills: string;
  sortAssists: string;
  sortMvps: string;
  sortHs: string;
  sortClutch: string;
  sortUtility: string;
  sortAwp: string;
  sortLevel: string;
  loadError: string;
  yourPosition: string;
  colPoints: string;
  colElo: string;
  colKd: string;
  colWinRate: string;
  colPlayer: string;
  colKills: string;
  colWins: string;
  colMatches: string;
  searchPlaceholder: string;
  topSeason: string;
  empty: string;
  playRanked: string;
  prev: string;
  next: string;
  paginationSummary: string;
  seasonLabel: string;
  seasonCurrent: string;
  seasonArchived: string;
  seasonArchivedHint: string;
  seasonSelectPlaceholder: string;
};

export async function getRankingBoardLabels(): Promise<RankingBoardLabels> {
  const t = await getTranslations("ranking");

  return {
    sortPoints: t("sortPoints"),
    sortElo: t("sortElo"),
    sortKd: t("sortKd"),
    sortWins: t("sortWins"),
    sortWinRate: t("sortWinRate"),
    sortKills: t("sortKills"),
    sortAssists: t("sortAssists"),
    sortMvps: t("sortMvps"),
    sortHs: t("sortHs"),
    sortClutch: t("sortClutch"),
    sortUtility: t("sortUtility"),
    sortAwp: t("sortAwp"),
    sortLevel: t("sortLevel"),
    loadError: t("loadError"),
    yourPosition: t("yourPosition"),
    colPoints: t("colPoints"),
    colElo: t("colElo"),
    colKd: t("colKd"),
    colWinRate: t("colWinRate"),
    colPlayer: t("colPlayer"),
    colKills: t("colKills"),
    colWins: t("colWins"),
    colMatches: t("colMatches"),
    searchPlaceholder: t("searchPlaceholder"),
    topSeason: t("topSeason"),
    empty: t("empty"),
    playRanked: t("playRanked"),
    prev: t("prev"),
    next: t("next"),
    paginationSummary: t.raw("paginationSummary") as string,
    seasonLabel: t("seasonLabel"),
    seasonCurrent: t("seasonCurrent"),
    seasonArchived: t("seasonArchived"),
    seasonArchivedHint: t("seasonArchivedHint"),
    seasonSelectPlaceholder: t("seasonSelectPlaceholder"),
  };
}
