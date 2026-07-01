import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { RankingPageClient } from "@/components/ranking/ranking-page-client";
import { CallToAction } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Ranking — clutchclube",
  description: "Ranking global Season 1 — ELO, K/D e estatísticas. Apenas partidas rankeadas.",
};

export default async function RankingPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingPageShell
        eyebrow={t("rankingEyebrow")}
        title={
          <>
            {t("rankingTitleA")} <span className="text-gradient">{t("rankingTitleB")}</span>{" "}
            {t("rankingTitleC")}
          </>
        }
        description={t("rankingDesc")}
      >
        <RankingPageClient variant="marketing" />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
