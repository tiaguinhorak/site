import { Hero } from "@/components/sections/hero";
import { HomeHighlights } from "@/components/marketing/home-highlights";
import { ClutchClubeShowcase } from "@/components/marketing/clutchclube-showcase";
import { CallToAction } from "@/components/sections/cta";
import { getSiteStats } from "@/lib/queries";
import { localizeSiteStats } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function Home() {
  const locale = await getRequestLocale();
  const stats = await localizeSiteStats(await getSiteStats(), locale);

  return (
    <>
      <Hero stats={stats.map((s) => ({ value: s.value, label: s.label }))} />
      <ClutchClubeShowcase />
      <HomeHighlights />
      <CallToAction />
    </>
  );
}
