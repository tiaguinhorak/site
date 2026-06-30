import { getTranslations } from "next-intl/server";
import type { PublicProfileLabels } from "@/lib/profile/public-profile-labels.shared";

export type { PublicProfileLabels } from "@/lib/profile/public-profile-labels.shared";
export { formatPublicProfileBadge } from "@/lib/profile/public-profile-labels.shared";

export async function getPublicProfileLabels(): Promise<PublicProfileLabels> {
  const t = await getTranslations("publicProfile");
  const tPlan = await getTranslations("profileCustomization");

  return {
    noBio: t("noBio"),
    rankBadgeTemplate: t("rankBadge", { rank: "{rank}" }),
    levelBadgeTemplate: t("levelBadge", { level: "{level}" }),
    anticheatVerified: t("anticheatVerified"),
    statsTitle: t("statsTitle"),
    kd: t("kd"),
    matches: t("matches"),
    winRate: t("winRate"),
    record: t("record"),
    globalPosition: t("globalPosition"),
    currentSeason: t("currentSeason"),
    eloRating: t("eloRating"),
    eloLabel: t("eloLabel"),
    competitiveScore: t("competitiveScore"),
    advancedStatsTitle: t("advancedStatsTitle"),
    hsPct: t("hsPct"),
    adr: t("adr"),
    mvps: t("mvps"),
    clutches: t("clutches"),
    awpKills: t("awpKills"),
    favoriteWeapon: t("favoriteWeapon"),
    favoriteMap: t("favoriteMap"),
    notAvailable: t("notAvailable"),
    plan: t("plan"),
    anticheat: t("anticheat"),
    installed: t("installed"),
    notDetected: t("notDetected"),
    country: t("country"),
    steam: t("steam"),
    linkedAccount: t("linkedAccount"),
    notLinked: t("notLinked"),
    persona: t("persona"),
    profile: t("profile"),
    planFree: tPlan("planFree"),
    planPremium: tPlan("planPremium"),
    planElite: tPlan("planElite"),
    shareProfile: t("shareProfile"),
    shareCopied: t("shareCopied"),
    shareCopiedShort: t("shareCopiedShort"),
    shareFailed: t("shareFailed"),
  };
}
