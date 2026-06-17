import { prisma } from "@/lib/prisma";
import { formatPriceCents } from "@/lib/serializers";
import {
  inventoryCategoryFromDb,
  inventoryRarityFromDb,
} from "@/lib/profile";

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

export async function getNewsArticles() {
  return prisma.newsArticle.findMany({
    orderBy: { publishedAt: "desc" },
  });
}

export async function getStoreItems() {
  return prisma.storeItem.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getUserInventory(userId: string) {
  const rows = await prisma.userInventoryItem.findMany({
    where: { userId },
    include: { inventoryItem: true },
    orderBy: { inventoryItem: { sortOrder: "asc" } },
  });

  return rows.map((row) => ({
    id: row.inventoryItem.id,
    name: row.inventoryItem.name,
    category: inventoryCategoryFromDb(row.inventoryItem.category),
    rarity: inventoryRarityFromDb(row.inventoryItem.rarity),
    accent: row.inventoryItem.accent,
    equipped: row.equipped,
    owned: row.owned,
  }));
}

export async function getPublicServers() {
  return prisma.publicServer.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getLeaderboard() {
  return prisma.leaderboardEntry.findMany({ orderBy: { rank: "asc" } });
}

export async function getMarketingFeatures() {
  return prisma.marketingFeature.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getSubscriptionPlans() {
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
}

export async function getSiteStats() {
  return prisma.siteStat.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getMarketingGameModes() {
  return prisma.gameMode.findMany({
    orderBy: { sortOrder: "asc" },
    take: 4,
  });
}

export async function getPremiumPlan() {
  return prisma.subscriptionPlan.findUnique({ where: { slug: "premium" } });
}
