import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { PlanComparisonTable } from "@/components/plans/plan-comparison-table";
import { PlansSection } from "@/components/plans/plans-section";

export default async function PlansPage() {
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell title={t("plansTitle")} description={t("plansDesc")}>
      <div className="space-y-12 sm:space-y-16">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            {t("comparePlans")}
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">{t("comparePlansDesc")}</p>
          <div className="mt-8 min-w-0">
            <PlansSection embedded />
          </div>
        </div>
        <PlanComparisonTable />
      </div>
    </DashboardPageShell>
  );
}
