import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PremiumFaq } from "@/components/marketing/premium-faq";
import { PremiumMarketingClient } from "@/components/marketing/premium-marketing-client";
import { CallToAction } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Premium — clutchclube",
  description: "Planos Free, Premium e Elite com skins, slot reservado e benefícios.",
};

export default async function PremiumPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingPageShell
        eyebrow={t("premiumEyebrow")}
        title={
          <>
            {t("premiumTitleA")}{" "}
            <span className="text-gradient">{t("premiumTitleB")}</span>
          </>
        }
        description={t("premiumDesc")}
        withGlow
      >
        <PremiumMarketingClient />
        <PremiumFaq />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
