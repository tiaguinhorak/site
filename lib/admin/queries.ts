import { prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

export async function getAdminStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const activeBanWhere = {
    type: "BAN" as const,
    active: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  const [
    totalUsers,
    completeProfiles,
    steamLinked,
    newToday,
    newWeek,
    newMonth,
    planFree,
    planPremium,
    planElite,
    mfaEnabled,
    anticheatInstalled,
    activeBans,
    activePunishments,
    totalServers,
    totalNews,
    totalStoreItems,
    totalGameModes,
    recentUsers,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { email: { not: null } } }),
    prisma.user.count({ where: { steamId: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.user.count({ where: { plan: "FREE" } }),
    prisma.user.count({ where: { plan: "PREMIUM" } }),
    prisma.user.count({ where: { plan: "ELITE" } }),
    prisma.user.count({ where: { mfaEnabled: true } }),
    prisma.user.count({ where: { anticheatInstalled: true } }),
    prisma.punishment.count({ where: activeBanWhere }),
    prisma.punishment.count({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.publicServer.count(),
    prisma.newsArticle.count(),
    prisma.storeItem.count(),
    prisma.gameMode.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        ...STEAM_DISPLAY_NAME_SELECT,
        email: true,
        plan: true,
        createdAt: true,
        avatarUrl: true,
        steamAvatarUrl: true,
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { admin: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } } },
    }),
  ]);

  return {
    totalUsers,
    completeProfiles,
    incompleteProfiles: totalUsers - completeProfiles,
    steamLinked,
    steamUnlinked: totalUsers - steamLinked,
    newToday,
    newWeek,
    newMonth,
    plans: { free: planFree, premium: planPremium, elite: planElite },
    mfaEnabled,
    anticheatInstalled,
    activeBans,
    activePunishments,
    totalServers,
    totalNews,
    totalStoreItems,
    totalGameModes,
    recentUsers: recentUsers.map((u) => ({
      ...u,
      displayName: resolveSteamDisplayName(u),
      plan: u.plan.toLowerCase(),
    })),
    recentAudit,
  };
}

export async function listAdminUsers(options: {
  q?: string;
  page?: number;
  limit?: number;
  plan?: string;
  isAdmin?: boolean;
  banned?: boolean;
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(10, options.limit ?? 20));
  const skip = (page - 1) * limit;
  const q = options.q?.trim();
  const now = new Date();

  const and: Record<string, unknown>[] = [];

  if (q) {
    and.push({
      OR: [
        { nickname: { contains: q } },
        { email: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { steamPersonaName: { contains: q } },
        { steamId: { contains: q } },
      ],
    });
  }

  if (options.plan) {
    and.push({ plan: options.plan });
  }

  if (options.isAdmin === true) {
    and.push({ isAdmin: true });
  }

  if (options.banned === true) {
    and.push({
      punishments: {
        some: {
          type: "BAN",
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    });
  }

  const where = and.length > 0 ? { AND: and } : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        nickname: true,
        email: true,
        firstName: true,
        lastName: true,
        plan: true,
        rank: true,
        elo: true,
        steamId: true,
        steamPersonaName: true,
        steamAvatarUrl: true,
        avatarUrl: true,
        country: true,
        isAdmin: true,
        mfaEnabled: true,
        anticheatInstalled: true,
        createdAt: true,
        updatedAt: true,
        punishments: {
          where: {
            type: "BAN",
            active: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          take: 1,
          select: { id: true, reason: true, expiresAt: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      ...u,
      displayName: resolveSteamDisplayName(u),
      isBanned: u.punishments.length > 0,
      banInfo: u.punishments[0] ?? null,
      punishments: undefined,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getAdminUserDetail(userId: string) {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      notifications: { orderBy: { createdAt: "desc" }, take: 15 },
      inventory: {
        include: { inventoryItem: true },
        take: 20,
      },
      punishments: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: {
          admin: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } },
          revokedBy: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } },
        },
      },
    },
  });

  if (!user) return null;

  const activeBan = user.punishments.find(
    (p) =>
      p.type === "BAN" &&
      p.active &&
      (!p.expiresAt || p.expiresAt > now),
  );

  return { ...user, isBanned: Boolean(activeBan), activeBan };
}

export async function listAdminPunishments(options: {
  page?: number;
  limit?: number;
  type?: string;
  active?: boolean;
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(10, options.limit ?? 20));
  const skip = (page - 1) * limit;
  const now = new Date();

  const where: Record<string, unknown> = {};

  if (options.type) {
    where.type = options.type;
  }

  if (options.active === true) {
    where.active = true;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (options.active === false) {
    where.active = false;
  }

  const [punishments, total] = await Promise.all([
    prisma.punishment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
            steamPersonaName: true,
            avatarUrl: true,
            steamAvatarUrl: true,
          },
        },
        admin: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } },
        revokedBy: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } },
      },
    }),
    prisma.punishment.count({ where }),
  ]);

  return { punishments, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function listAdminNotifications(options: {
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(10, options.limit ?? 20));
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
      },
    }),
    prisma.notification.count(),
  ]);

  return { notifications, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function listAdminServers() {
  return prisma.publicServer.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function listAdminAuditLogs(options: {
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(10, options.limit ?? 30));
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { admin: { select: { id: true, ...STEAM_DISPLAY_NAME_SELECT } } },
    }),
    prisma.adminAuditLog.count(),
  ]);

  return { logs, total, page, limit, pages: Math.ceil(total / limit) };
}
