import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { UpgradeSection } from "@/components/dashboard/upgrade-section";
import { Premium } from "@/components/sections/premium";
import { getSubscriptionPlans } from "@/lib/queries";

export default async function PremiumPage() {
  const plans = await getSubscriptionPlans();

  return (
    <DashboardPageShell
      title="Premium"
      description="Compare planos e faça upgrade para desbloquear todos os benefícios."
    >
      <div className="space-y-10 sm:space-y-14">
        <UpgradeSection />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            Comparar planos
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Todos os planos disponíveis no clutchclube.
          </p>
          <div className="mt-8 min-w-0">
            <Premium embedded plans={plans} />
          </div>
        </div>
      </div>
    </DashboardPageShell>
  );
}
