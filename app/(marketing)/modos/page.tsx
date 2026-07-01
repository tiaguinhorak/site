import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { ModosMarketingClient } from "@/components/marketing/modos-marketing-client";
import { CallToAction } from "@/components/sections/cta";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Modos de jogo — clutchclube",
  description: "Retakes, Deathmatch, ForFun e Movimentação nos servidores clutchclube.",
};

export default async function ModosPage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingPageShell
        eyebrow={t("modosEyebrow")}
        title={
          <>
            {t("modosTitleA")}{" "}
            <span className="text-gradient">{t("modosTitleB")}</span>
          </>
        }
        description={t("modosDesc")}
      >
        <ModosMarketingClient />
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-card glass p-6 sm:flex-row">
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {t("modosReadyTitle")}
            </p>
            <p className="mt-1 text-sm text-muted">{t("modosReadyDesc")}</p>
          </div>
          <ButtonLink href="/register" variant="primary" size="md">
            {t("createAccountFree")}
          </ButtonLink>
        </div>
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
