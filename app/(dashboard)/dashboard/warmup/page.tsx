import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { WarmupModesSection } from "@/components/dashboard/warmup-modes-section";

export default async function WarmupPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell title={t("warmupTitle")} description={t("warmupDesc")}>
      <WarmupModesSection />
    </DashboardPageShell>
  );
}
