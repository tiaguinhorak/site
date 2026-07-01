import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { MatchDetailClient } from "@/components/dashboard/match-detail-client";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell wide title={t("matchDetailTitle")} description={t("matchDetailDesc")}>
      <MatchDetailClient matchId={id} />
    </DashboardPageShell>
  );
}
