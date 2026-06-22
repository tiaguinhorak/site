import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardProviders } from "@/components/dashboard/dashboard-providers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("dashboardTitle"),
    description: t("dashboardDescription"),
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProviders>
  );
}
