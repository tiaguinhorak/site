import { getTranslations } from "next-intl/server";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { FriendsSectionClient } from "@/components/dashboard/friends-section-client";

export default async function FriendsPage() {
  const t = await getTranslations("pageHeaders");
  return (
    <DashboardPageShell wide title={t("friendsTitle")} description={t("friendsDesc")}>
      <FriendsSectionClient />
    </DashboardPageShell>
  );
}
