import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { MatchesSection } from "@/components/dashboard/matches-section";

export default async function PartidasPage() {
  const t = await getTranslations("pageHeaders");
  const tc = await getTranslations("common");

  return (
    <DashboardPageShell wide title={t("matchesTitle")} description={t("matchesDesc")}>
      <Suspense
        fallback={
          <div className="rounded-card glass p-8 text-center text-muted">
            {tc("loading")}
          </div>
        }
      >
        <MatchesSection />
      </Suspense>
    </DashboardPageShell>
  );
}
