import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { SupportSection } from "@/components/dashboard/support-section";

export default async function SuportePage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("supportTitle")}
      description={t("supportDesc")}
    >
      <SupportSection />
    </DashboardPageShell>
  );
}
