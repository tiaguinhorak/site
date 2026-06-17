import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/brand";
import { BRAND_ASSETS } from "@/lib/brand-assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description:
      "Rede competitiva de CS2 — retakes, deathmatch, ranking ELO e anticheat próprio.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#07050d",
    background_color: "#07050d",
    icons: [
      {
        src: BRAND_ASSETS.favicon,
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: BRAND_ASSETS.iconSmall,
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: BRAND_ASSETS.manifest192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: BRAND_ASSETS.manifest512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
