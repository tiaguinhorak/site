import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { ClansSection } from "@/components/dashboard/clans-section";

export default async function ClansPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell wide title={t("clansTitle")} description={t("clansDesc")}>
      <ClansSection />
    </DashboardPageShell>
  );
}
