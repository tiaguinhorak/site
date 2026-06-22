import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { StoreSection } from "@/components/dashboard/store-section";

export default async function LojaPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("storeTitle")}
      description={t("storeDesc")}
    >
      <StoreSection />
    </DashboardPageShell>
  );
}
