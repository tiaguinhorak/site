import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Premium } from "@/components/sections/premium";
import { PremiumFaq } from "@/components/marketing/premium-faq";
import { CallToAction } from "@/components/sections/cta";
import { getSubscriptionPlans } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Premium — clutchclube",
  description: "Planos Free, Premium e Elite com skins, slot reservado e benefícios.",
};

export default async function PremiumPage() {
  const t = await getTranslations("marketing");
  const plans = await getSubscriptionPlans();

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
        <Premium embedded plans={plans} />
        <PremiumFaq />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
