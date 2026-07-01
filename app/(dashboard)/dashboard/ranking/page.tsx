import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { RankingPageClient } from "@/components/ranking/ranking-page-client";

export default async function DashboardRankingPage() {
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell wide title={t("rankingTitle")} description={t("rankingDesc")}>
      <RankingPageClient variant="dashboard" />
    </DashboardPageShell>
  );
}
