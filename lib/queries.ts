import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { syncCsgoPublicServers } from "@/lib/csgo-api/sync-public-servers";
import { queryCsgoServersLive } from "@/lib/csgo-api/query-live-server";
import { formatPriceCents } from "@/lib/serializers";
import {
  inventoryCategoryFromDb,
  inventoryRarityFromDb,
} from "@/lib/profile";
import { catalogSkinImageUrl } from "@/lib/inventory/skin-images";
import { resolveCatalogIdForInventoryItem } from "@/lib/inventory/catalog-links";

export async function getGameModesWithRooms() {
  return prisma.gameMode.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      rooms: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getGameModeBySlug(slug: string) {
  return prisma.gameMode.findUnique({
    where: { slug },
    include: {
      rooms: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

const newsAuthorSelect = {
  nickname: true,
  avatarUrl: true,
  avatarPreset: true,
  steamAvatarUrl: true,
} as const;

export async function getNewsArticles() {
  return prisma.newsArticle.findMany({
    where: { archivedAt: null },
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: {
      author: { select: newsAuthorSelect },
    },
  });
}

export async function getNewsArticleBySlug(slug: string) {
  return prisma.newsArticle.findFirst({
    where: { slug, archivedAt: null },
    include: {
      author: { select: newsAuthorSelect },
    },
  });
}

export async function getStoreItems() {
  return prisma.storeItem.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getUserInventory(userId: string) {
  const [catalog, userRows] = await Promise.all([
    prisma.inventoryItem.findMany({
      include: { catalogSkin: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.userInventoryItem.findMany({
      where: { userId },
    }),
  ]);

  const userByItemId = new Map(
    userRows.map((row) => [row.inventoryItemId, row]),
  );

  return catalog.map((item) => {
    const ownedRow = userByItemId.get(item.id);
    const catalogId = resolveCatalogIdForInventoryItem(item.name, item.catalogSkinId);
    return {
      id: item.id,
      name: item.name,
      category: inventoryCategoryFromDb(item.category),
      rarity: inventoryRarityFromDb(item.rarity),
      accent: item.accent,
      imageUrl:
        item.imageUrl ??
        item.catalogSkin?.imageUrl ??
        catalogSkinImageUrl(catalogId) ??
        null,
      paintkitName: item.catalogSkin?.paintkitName ?? null,
      weaponId: item.catalogSkin?.weaponId ?? null,
      catalogLinked: Boolean(catalogId),
      equipped: ownedRow?.equipped ?? false,
      owned: ownedRow?.owned ?? false,
    };
  });
}

export async function getPublicServers(options?: { syncLive?: boolean }) {
  if (options?.syncLive) {
    await syncCsgoPublicServers();
  }

  const rows = await prisma.publicServer.findMany({
    orderBy: [{ isLiveSynced: "desc" }, { sortOrder: "asc" }],
  });

  const liveTargets = rows
    .filter(
      (row): row is typeof row & { host: string; port: number } =>
        row.isLiveSynced && row.host != null && row.port != null,
    )
    .map((row) => ({ host: row.host, port: row.port }));

  if (liveTargets.length === 0) return rows;

  const liveByKey = await queryCsgoServersLive(liveTargets);

  return rows.map((row) => {
    if (!row.isLiveSynced || !row.host || !row.port) return row;

    const live = liveByKey.get(`${row.host}:${row.port}`);
    if (!live?.online) {
      return { ...row, map: "offline", players: 0, ping: 0 };
    }

    return {
      ...row,
      map: live.mapRaw ?? live.map,
      players: live.players,
      slots: live.slots,
      ping: live.ping,
    };
  });
}

export async function getLiveSyncedServers() {
  const { fetchLiveServerStats } = await import("@/lib/csgo-api/live-server-stats");
  return fetchLiveServerStats();
}

export async function getLeaderboard() {
  return unstable_cache(
    async () => {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { competitivePoints: { gt: 0 } },
            { rankedWins: { gt: 0 } },
            { rankedLosses: { gt: 0 } },
          ],
        },
        orderBy: [{ competitivePoints: "desc" }, { rankedWins: "desc" }],
        take: 50,
        select: {
          nickname: true,
          kd: true,
          competitivePoints: true,
        },
      });

      if (users.length > 0) {
        return users.map((user, index) => ({
          rank: index + 1,
          name: user.nickname,
          kd: user.kd,
          points: user.competitivePoints,
        }));
      }

      const seed = await prisma.leaderboardEntry.findMany({
        orderBy: { rank: "asc" },
        take: 50,
      });
      return seed.map((entry) => ({
        rank: entry.rank,
        name: entry.name,
        kd: entry.kd,
        points: entry.points,
      }));
    },
    ["site-leaderboard"],
    { revalidate: 120 },
  )();
}

export async function getMarketingFeatures() {
  return unstable_cache(
    async () => prisma.marketingFeature.findMany({ orderBy: { sortOrder: "asc" } }),
    ["site-marketing-features"],
    { revalidate: 300 },
  )();
}

export async function getSubscriptionPlans() {
  return unstable_cache(
    async () => {
      const plans = await prisma.subscriptionPlan.findMany({
        orderBy: { sortOrder: "asc" },
      });
      return plans.map((plan) => ({
        name: plan.name,
        price: plan.priceCents === 0 ? "R$0" : formatPriceCents(plan.priceCents),
        period: plan.period,
        highlight: plan.highlight,
        badge: plan.badge ?? undefined,
        features: JSON.parse(plan.features) as string[],
        cta: plan.cta,
      }));
    },
    ["site-subscription-plans"],
    { revalidate: 300 },
  )();
}

export async function getSiteStats() {
  return unstable_cache(
    async () => prisma.siteStat.findMany({ orderBy: { sortOrder: "asc" } }),
    ["site-stats"],
    { revalidate: 120 },
  )();
}

export async function getMarketingGameModes() {
  return unstable_cache(
    async () =>
      prisma.gameMode.findMany({
        orderBy: { sortOrder: "asc" },
        take: 4,
      }),
    ["site-marketing-game-modes"],
    { revalidate: 300 },
  )();
}

export async function getPremiumPlan() {
  return prisma.subscriptionPlan.findUnique({ where: { slug: "premium" } });
}
