import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPriceCents } from "@/lib/serializers";
import { localizeSubscriptionPlans } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";

export async function GET(request: NextRequest) {
  const locale = await getRequestLocale(request);
  const [rawPlans, storeItems] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.storeItem.findMany({
      where: {
        enabled: true,
        productKind: "SUBSCRIPTION",
        grantPlan: { not: "FREE" },
      },
      select: {
        id: true,
        name: true,
        grantPlan: true,
        priceCents: true,
        coinPrice: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const marketingPlans = await localizeSubscriptionPlans(
    rawPlans.map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      price: plan.priceCents === 0 ? "R$0" : formatPriceCents(plan.priceCents),
      period: plan.period,
      highlight: plan.highlight,
      badge: plan.badge ?? undefined,
      features: JSON.parse(plan.features) as string[],
      cta: plan.cta,
    })),
    locale,
  );

  const byPlan = new Map(
    storeItems.map((item) => [item.grantPlan, item]),
  );

  return NextResponse.json({
    plans: marketingPlans.map((plan, index) => {
      const raw = rawPlans[index];
      const slug = raw?.slug ?? plan.name.toLowerCase();
      const grantPlan =
        slug === "premium" ? "PREMIUM" : slug === "elite" ? "ELITE" : null;
      const storeItem = grantPlan ? byPlan.get(grantPlan) : undefined;

      return {
        ...plan,
        id: raw?.id ?? slug,
        slug,
        storeItemId: storeItem?.id ?? null,
        storePrice: storeItem ? formatPriceCents(storeItem.priceCents) : plan.price,
        storePriceCents: storeItem?.priceCents ?? null,
        coinPrice: storeItem?.coinPrice ?? null,
        canBuyWithCoins: Boolean(storeItem?.coinPrice != null && storeItem.coinPrice > 0),
        grantPlan: storeItem?.grantPlan ?? grantPlan,
      };
    }),
  });
}
