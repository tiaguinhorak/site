import "server-only";

import type { Locale } from "@/lib/i18n";
import { buildEntityTranslations, localizeRows } from "@/lib/i18n/localize-dynamic";
import { persistDynamicTranslations, stripLocalizationMeta } from "@/lib/i18n/persist-dynamic";
import { prisma } from "@/lib/prisma";
import type { PlanView } from "@/components/sections/premium";

type LocalizableRow = Record<string, unknown> & { id: string };

type SubscriptionPlanRow = PlanView & { id: string };

export async function localizeMarketingFeatures<T extends LocalizableRow>(
  rows: T[],
  locale: Locale,
): Promise<T[]> {
  const localized = await localizeRows("marketingFeature", rows, locale);
  await persistDynamicTranslations(localized, async (id, translations) => {
    await prisma.marketingFeature.update({ where: { id }, data: { translations } });
  });
  return localized.map((row) => stripLocalizationMeta(row) as T);
}

export async function localizeSiteStats<T extends LocalizableRow>(
  rows: T[],
  locale: Locale,
): Promise<T[]> {
  const localized = await localizeRows("siteStat", rows, locale);
  await persistDynamicTranslations(localized, async (id, translations) => {
    await prisma.siteStat.update({ where: { id }, data: { translations } });
  });
  return localized.map((row) => stripLocalizationMeta(row) as T);
}

export async function localizeSubscriptionPlans(
  rows: SubscriptionPlanRow[],
  locale: Locale,
): Promise<PlanView[]> {
  const prepared = rows.map((row) => ({
    ...row,
    features: row.features.join("|||"),
  }));
  const localized = await localizeRows("subscriptionPlan", prepared, locale);
  await persistDynamicTranslations(localized, async (id, translations) => {
    await prisma.subscriptionPlan.update({ where: { id }, data: { translations } });
  });
  return localized.map((row) => {
    const { id: _id, features, ...plan } = stripLocalizationMeta(row);
    return {
      ...plan,
      features: String(features).split("|||").filter(Boolean),
    };
  });
}

export async function refreshMarketingFeatureTranslations(row: LocalizableRow): Promise<void> {
  const translations = await buildEntityTranslations("marketingFeature", row);
  await prisma.marketingFeature.update({
    where: { id: row.id },
    data: { translations },
  });
}

export async function refreshSubscriptionPlanTranslations(row: LocalizableRow): Promise<void> {
  const translations = await buildEntityTranslations("subscriptionPlan", row);
  await prisma.subscriptionPlan.update({
    where: { id: row.id },
    data: { translations },
  });
}

export async function refreshSiteStatTranslations(row: LocalizableRow): Promise<void> {
  const translations = await buildEntityTranslations("siteStat", row);
  await prisma.siteStat.update({
    where: { id: row.id },
    data: { translations },
  });
}
