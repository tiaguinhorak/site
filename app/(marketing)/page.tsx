import { Hero } from "@/components/sections/hero";
import { HomeHighlights } from "@/components/marketing/home-highlights";
import { ClutchClubeShowcase } from "@/components/marketing/clutchclube-showcase";
import { CallToAction } from "@/components/sections/cta";
import { getSiteStats } from "@/lib/queries";

export default async function Home() {
  const stats = await getSiteStats();

  return (
    <>
      <Hero stats={stats.map((s) => ({ value: s.value, label: s.label }))} />
      <ClutchClubeShowcase />
      <HomeHighlights />
      <CallToAction />
    </>
  );
}
