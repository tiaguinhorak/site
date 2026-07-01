import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { ServersMarketingClient } from "@/components/marketing/servers-marketing-client";
import { CallToAction } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Servidores — clutchclube",
  description:
    "65 servidores de alta performance em São Paulo com 10 Gbps e 18ms de ping.",
};

export default async function ServidoresPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingPageShell
        eyebrow={t("servidoresEyebrow")}
        title={
          <>
            {t("servidoresTitleA")}{" "}
            <span className="text-gradient">{t("servidoresTitleB")}</span>
          </>
        }
        description={t("servidoresDesc")}
      >
        <ServersMarketingClient />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
