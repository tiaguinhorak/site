import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { AnticheatSection } from "@/components/dashboard/anticheat-section";

export default function AnticheatPage() {
  return (
    <DashboardPageShell
      title="Anticheat"
      description="Download, instalação e status da proteção nos servidores."
    >
      <AnticheatSection />
    </DashboardPageShell>
  );
}
