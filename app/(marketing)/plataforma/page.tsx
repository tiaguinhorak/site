import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PlataformaMarketingClient } from "@/components/marketing/plataforma-marketing-client";
import { CallToAction } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Plataforma — clutchclube",
  description:
    "Ranking com ELO, inventário de skins, perfil público e Quick Connect.",
};

export default async function PlataformaPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingPageShell
        eyebrow={t("plataformaEyebrow")}
        title={
          <>
            {t("plataformaTitleA")}{" "}
            <span className="text-gradient">{t("plataformaTitleB")}</span>
          </>
        }
        description={t("plataformaDesc")}
      >
        <PlataformaMarketingClient />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
