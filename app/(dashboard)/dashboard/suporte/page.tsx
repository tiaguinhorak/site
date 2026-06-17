import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { SupportSection } from "@/components/dashboard/support-section";

export default function SuportePage() {
  return (
    <DashboardPageShell
      title="Suporte"
      description="Canais de ajuda, tickets e status dos serviços."
    >
      <SupportSection />
    </DashboardPageShell>
  );
}
