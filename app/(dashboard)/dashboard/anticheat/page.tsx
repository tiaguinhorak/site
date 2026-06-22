import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { AnticheatSection } from "@/components/dashboard/anticheat-section";

export default async function AnticheatPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("anticheatTitle")}
      description={t("anticheatDesc")}
    >
      <AnticheatSection />
    </DashboardPageShell>
  );
}
