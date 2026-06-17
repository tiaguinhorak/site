import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { NotificationsSection } from "@/components/dashboard/notifications-section";

export default function NotificacoesPage() {
  return (
    <DashboardPageShell
      title="Notificações"
      description="Atualizações, partidas e alertas da sua conta."
    >
      <NotificationsSection />
    </DashboardPageShell>
  );
}
