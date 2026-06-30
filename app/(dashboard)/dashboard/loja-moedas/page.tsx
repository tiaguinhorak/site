import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { CoinShopSection } from "@/components/dashboard/coin-shop-section";

export default async function LojaMoedasPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("coinShopTitle")}
      description={t("coinShopDesc")}
    >
      <CoinShopSection />
    </DashboardPageShell>
  );
}
