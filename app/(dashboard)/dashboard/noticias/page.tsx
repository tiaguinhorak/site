import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { NewsSection } from "@/components/dashboard/news-section";

export default async function NoticiasPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("newsTitle")}
      description={t("newsDesc")}
    >
      <NewsSection />
    </DashboardPageShell>
  );
}
