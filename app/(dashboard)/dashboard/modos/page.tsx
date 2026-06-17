import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { GameModesSection } from "@/components/dashboard/game-modes-section";

export default function ModosPage() {
  return (
    <DashboardPageShell
      title="Modos de jogo"
      description="Escolha um modo e conecte ao melhor servidor disponível."
    >
      <GameModesSection />
    </DashboardPageShell>
  );
}
