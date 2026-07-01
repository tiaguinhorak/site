import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { ProfileSectionClient } from "@/components/dashboard/profile-section-client";

export default async function PerfilPage() {
  const t = await getTranslations("pageHeaders");

  return (
    <DashboardPageShell title={t("profileTitle")} description={t("profileDesc")}>
      <ProfileSectionClient />
    </DashboardPageShell>
  );
}
