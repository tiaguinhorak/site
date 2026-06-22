import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { UpgradeSection } from "@/components/dashboard/upgrade-section";
import { Premium } from "@/components/sections/premium";
import { getSubscriptionPlans } from "@/lib/queries";

export default async function PremiumPage() {
  const plans = await getSubscriptionPlans();
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell
      title={t("premiumTitle")}
      description={t("premiumDesc")}
    >
      <div className="space-y-10 sm:space-y-14">
        <UpgradeSection />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            {t("comparePlans")}
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">
            {t("comparePlansDesc")}
          </p>
          <div className="mt-8 min-w-0">
            <Premium embedded plans={plans} />
          </div>
        </div>
      </div>
    </DashboardPageShell>
  );
}
