import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { StoreSection } from "@/components/dashboard/store-section";

export default function LojaPage() {
  return (
    <DashboardPageShell
      title="Loja"
      description="Skins, agentes e cosméticos exclusivos nos servidores clutchclube."
    >
      <StoreSection />
    </DashboardPageShell>
  );
}
