import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { RankedExperience } from "@/components/dashboard/ranked-experience";

export default async function RankedPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      wide
      title={t("rankedTitle")}
      description={t("rankedDesc")}
    >
      <RankedExperience />
    </DashboardPageShell>
  );
}
