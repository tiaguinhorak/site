import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { LiveServersSection } from "@/components/dashboard/live-servers-section";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-10 sm:space-y-12">
      <DashboardWelcome />
      <LiveServersSection />
      <DashboardOverview />
    </div>
  );
}
