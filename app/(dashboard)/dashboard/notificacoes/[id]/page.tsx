import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { NotificationDetailSection } from "@/components/dashboard/notification-detail-section";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NotificationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("notificationDetailTitle")}
      description={t("notificationDetailDesc")}
    >
      <NotificationDetailSection id={id} />
    </DashboardPageShell>
  );
}
