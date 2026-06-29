import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { InventorySectionClient } from "@/components/dashboard/inventory-section-client";

export default async function InventarioPage() {
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell
      title={t("inventoryTitle")}
      description={t("inventoryDesc")}
    >
      <InventorySectionClient />
    </DashboardPageShell>
  );
}
