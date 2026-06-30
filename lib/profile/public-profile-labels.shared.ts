export type PublicProfileLabels = {
  noBio: string;
  /** ICU template with `{rank}` placeholder — resolved on the client per player. */
  rankBadgeTemplate: string;
  /** ICU template with `{level}` placeholder — resolved on the client per player. */
  levelBadgeTemplate: string;
  anticheatVerified: string;
  statsTitle: string;
  kd: string;
  matches: string;
  winRate: string;
  record: string;
  globalPosition: string;
  currentSeason: string;
  eloRating: string;
  eloLabel: string;
  competitiveScore: string;
  advancedStatsTitle: string;
  hsPct: string;
  adr: string;
  mvps: string;
  clutches: string;
  awpKills: string;
  favoriteWeapon: string;
  favoriteMap: string;
  notAvailable: string;
  plan: string;
  anticheat: string;
  installed: string;
  notDetected: string;
  country: string;
  steam: string;
  linkedAccount: string;
  notLinked: string;
  persona: string;
  profile: string;
  planFree: string;
  planPremium: string;
  planElite: string;
  shareProfile: string;
  shareCopied: string;
  shareCopiedShort: string;
  shareFailed: string;
};

export function formatPublicProfileBadge(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
