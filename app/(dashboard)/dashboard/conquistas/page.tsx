import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { AchievementsSection } from "@/components/dashboard/achievements-section";

export default async function AchievementsPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell wide title={t("achievementsTitle")} description={t("achievementsDesc")}>
      <AchievementsSection />
    </DashboardPageShell>
  );
}
