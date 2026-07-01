import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardAdminRankedPanel } from "@/components/dashboard/dashboard-admin-ranked-panel";
import { LiveServersSection } from "@/components/dashboard/live-servers-section";

export default function DashboardPage() {
  return (
    <div className="layout-container space-y-10 sm:space-y-12">
      <DashboardWelcome />
      <DashboardAdminRankedPanel />
      <LiveServersSection />
      <DashboardOverview />
    </div>
  );
}
