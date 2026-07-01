import { getTranslations } from "next-intl/server";
import { LEADERBOARD_SCORING } from "@/lib/leaderboard/constants";
import type { RankingScoringHintLabels } from "@/components/ranking/ranking-scoring-hint-client";

export async function getRankingScoringLabels(): Promise<RankingScoringHintLabels> {
  const t = await getTranslations("ranking");

  return {
    scoringTitle: t("scoringTitle"),
    scoringDesc: t("scoringDesc"),
    rows: [
      { label: t("scoringWin"), value: `+${LEADERBOARD_SCORING.winPoints}` },
      { label: t("scoringLoss"), value: `${LEADERBOARD_SCORING.lossPoints}` },
      { label: t("scoringKill"), value: `+${LEADERBOARD_SCORING.killPoints}` },
      { label: t("scoringDeath"), value: `${LEADERBOARD_SCORING.deathPoints}` },
      { label: t("scoringEloWin"), value: `+${LEADERBOARD_SCORING.eloWin}` },
      { label: t("scoringEloLoss"), value: `-${LEADERBOARD_SCORING.eloLoss}` },
    ],
  };
}
