import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { LobbySection } from "@/components/dashboard/lobby-section";

export default async function LobbyPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell
      title={t("lobbyTitle")}
      description={t("lobbyDesc")}
    >
      <LobbySection />
    </DashboardPageShell>
  );
}
