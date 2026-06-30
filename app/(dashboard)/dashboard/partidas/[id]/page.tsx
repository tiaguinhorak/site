import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { MatchDetailView } from "@/components/dashboard/match-detail-view";
import { fetchMatchDetail } from "@/lib/ranked/match-detail";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("pageHeaders");
  const match = await fetchMatchDetail(id);

  if (!match) {
    notFound();
  }

  return (
    <DashboardPageShell wide title={t("matchDetailTitle")} description={t("matchDetailDesc")}>
      <MatchDetailView match={match} />
    </DashboardPageShell>
  );
}
