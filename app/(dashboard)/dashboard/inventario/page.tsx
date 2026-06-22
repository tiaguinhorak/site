import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { InventorySection } from "@/components/dashboard/inventory-section";

export default async function InventarioPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("inventoryTitle")}
      description={t("inventoryDesc")}
    >
      <InventorySection />
    </DashboardPageShell>
  );
}
