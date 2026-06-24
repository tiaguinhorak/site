import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SeasonInfo } from "@/components/marketing/season-info";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { CallToAction } from "@/components/sections/cta";
import { fetchLeaderboardPage } from "@/lib/leaderboard/queries";

export const metadata: Metadata = {
  title: "Ranking — clutchclube",
  description: "Ranking global Season 1 — ELO, K/D e estatísticas. Apenas partidas rankeadas.",
};

export default async function RankingPage() {
  const t = await getTranslations("marketing");
  const initialData = await fetchLeaderboardPage({
    page: 1,
    limit: 25,
    sort: "points",
  });

  return (
    <>
      <MarketingPageShell
        eyebrow={t("rankingEyebrow")}
        title={
          <>
            {t("rankingTitleA")} <span className="text-gradient">{t("rankingTitleB")}</span> {t("rankingTitleC")}
          </>
        }
        description={t("rankingDesc")}
      >
        <SeasonInfo />
        <div className="mt-10">
          <RankingBoard initialData={initialData} variant="marketing" />
        </div>
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
