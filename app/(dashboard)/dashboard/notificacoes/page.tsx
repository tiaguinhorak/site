import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { NotificationsSection } from "@/components/dashboard/notifications-section";

export default async function NotificacoesPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("notificationsTitle")}
      description={t("notificationsDesc")}
    >
      <NotificationsSection />
    </DashboardPageShell>
  );
}
