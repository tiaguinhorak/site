import { NextResponse } from "next/server";
import { getMarketingFeatures, getSiteStats } from "@/lib/queries";
import { localizeMarketingFeatures, localizeSiteStats } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";

export async function GET() {
  const locale = await getRequestLocale();
  const [features, stats] = await Promise.all([
    localizeMarketingFeatures(await getMarketingFeatures(), locale),
    localizeSiteStats(await getSiteStats(), locale),
  ]);

  return NextResponse.json({
    stats,
    features: features.map((feature) => ({
      index: feature.index,
      title: feature.title,
      description: feature.description,
      iconKey: feature.iconKey,
    })),
  });
}
