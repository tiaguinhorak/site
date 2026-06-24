import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { SeasonInfo } from "@/components/marketing/season-info";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { RankingScoringInfo } from "@/components/ranking/ranking-scoring-info";
import { getSessionUserFromCookies } from "@/lib/auth/session-user";
import { fetchLeaderboardPage } from "@/lib/leaderboard/queries";

export default async function DashboardRankingPage() {
  const t = await getTranslations("pageHeaders");
  const sessionUser = await getSessionUserFromCookies();
  const initialData = await fetchLeaderboardPage({
    page: 1,
    limit: 25,
    sort: "points",
    userId: sessionUser?.id,
  });

  return (
    <DashboardPageShell wide title={t("rankingTitle")} description={t("rankingDesc")}>
      <div className="mb-8 space-y-6">
        <SeasonInfo />
        <RankingScoringInfo />
      </div>
      <RankingBoard initialData={initialData} variant="dashboard" />
    </DashboardPageShell>
  );
}
