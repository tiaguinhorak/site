import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { StoreSectionClient } from "@/components/dashboard/store-section-client";

export default async function LojaPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("storeTitle")}
      description={t("storeDesc")}
    >
      <StoreSectionClient />
    </DashboardPageShell>
  );
}
