import type { Metadata } from "next";
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
  const plans = await getSubscriptionPlans();

  return (
    <>
      <MarketingPageShell
        eyebrow="Planos"
        title={
          <>
            Eleve sua experiência ao{" "}
            <span className="text-gradient">máximo</span>
          </>
        }
        description="Alta performance, skins liberadas e liberdade para jogar do seu jeito. Cancele quando quiser."
        withGlow={false}
      >
        <Premium embedded plans={plans} />
        <PremiumFaq />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
