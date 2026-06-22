import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { ProfileSection } from "@/components/dashboard/profile-section";

export default async function PerfilPage() {
  const t = await getTranslations("pageHeaders");
  const tc = await getTranslations("common");
  return (
    <DashboardPageShell
      title={t("profileTitle")}
      description={t("profileDesc")}
    >
      <Suspense
        fallback={
          <div className="rounded-card glass p-8 text-center text-muted">
            {tc("loading")}
          </div>
        }
      >
        <ProfileSection />
      </Suspense>
    </DashboardPageShell>
  );
}
