import { ClutchClubeShowcase } from "@/components/marketing/clutchclube-showcase";
import { HomeHighlights } from "@/components/marketing/home-highlights";
import { HomeHeroClient } from "@/components/marketing/home-hero-client";
import { CallToAction } from "@/components/sections/cta";

export default function Home() {
  return (
    <>
      <HomeHeroClient />
      <ClutchClubeShowcase />
      <HomeHighlights />
      <CallToAction />
    </>
  );
}
