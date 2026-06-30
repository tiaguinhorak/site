import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { BattlePassSection } from "@/components/dashboard/battle-pass-section";

export default async function BattlePassPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell wide title={t("battlePassTitle")} description={t("battlePassDesc")}>
      <BattlePassSection />
    </DashboardPageShell>
  );
}
