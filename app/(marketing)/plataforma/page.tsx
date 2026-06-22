import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Features } from "@/components/sections/features";
import { CallToAction } from "@/components/sections/cta";
import { getMarketingFeatures, getSiteStats } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Plataforma — clutchclube",
  description:
    "Ranking com ELO, inventário de skins, perfil público e Quick Connect.",
};

export default async function PlataformaPage() {
  const t = await getTranslations("marketing");
  const features = await getMarketingFeatures();
  const stats = await getSiteStats();

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
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card glass px-4 py-5 text-center">
              <p className="font-display text-2xl font-bold text-gradient sm:text-3xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <Features
          embedded
          features={features.map((f) => ({
            index: f.index,
            title: f.title,
            description: f.description,
            iconKey: f.iconKey,
          }))}
        />
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
