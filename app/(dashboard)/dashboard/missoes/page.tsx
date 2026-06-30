import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { MissionsSection } from "@/components/dashboard/missions-section";

export default async function MissionsPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell wide title={t("missionsTitle")} description={t("missionsDesc")}>
      <MissionsSection />
    </DashboardPageShell>
  );
}
