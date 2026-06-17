import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { NewsSection } from "@/components/dashboard/news-section";

export default function NoticiasPage() {
  return (
    <DashboardPageShell
      title="Central de notícias"
      description="Patches, eventos e novidades da clutchclube."
    >
      <NewsSection />
    </DashboardPageShell>
  );
}
