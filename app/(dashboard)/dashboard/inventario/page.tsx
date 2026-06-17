import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { InventorySection } from "@/components/dashboard/inventory-section";

export default function InventarioPage() {
  return (
    <DashboardPageShell
      title="Inventário"
      description="Equipe facas, luvas, rifles e agentes nos servidores clutchclube."
    >
      <InventorySection />
    </DashboardPageShell>
  );
}
