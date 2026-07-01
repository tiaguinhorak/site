import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { ClansSectionClient } from "@/components/dashboard/clans-section-client";

export default async function ClansPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell wide title={t("clansTitle")} description={t("clansDesc")}>
      <ClansSectionClient />
    </DashboardPageShell>
  );
}
