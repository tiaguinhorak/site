"use client";

import { useTranslations } from "next-intl";
import { RankedMatchHistory } from "@/components/profile/ranked-match-history";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { useUser } from "@/lib/hooks/use-user";

export function MatchesSection() {
  const t = useTranslations("common");
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">
        {t("loading")}
      </div>
    );
  }

  if (!user?.nickname) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">
        {t("loginToConnect")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PerformanceChart nickname={user.nickname} />
      <RankedMatchHistory nickname={user.nickname} limit={50} />
    </div>
  );
}
