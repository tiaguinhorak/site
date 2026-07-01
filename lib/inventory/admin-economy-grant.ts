import "server-only";

import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { logAdminAction } from "@/lib/admin/audit";
import {
  getUserObtainedAgentDefIndexes,
  getUserObtainedStickerDefIndexes,
} from "@/lib/inventory/user-obtained-economy";

export type AdminGrantEconomyRow = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  subLabel: string | null;
  ownedByUser: boolean;
};

export type AdminGrantedEconomyItem = {
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  subLabel: string | null;
};

async function ownedDefIndexesForKind(
  userId: string,
  kind: "AGENT" | "STICKER",
): Promise<Set<number>> {
  return kind === "AGENT"
    ? getUserObtainedAgentDefIndexes(userId)
    : getUserObtainedStickerDefIndexes(userId);
}

export async function listGrantedEconomyItemsForUser(
  userId: string,
  kind: "AGENT" | "STICKER",
): Promise<AdminGrantedEconomyItem[]> {
  const owned = await ownedDefIndexesForKind(userId, kind);
  if (owned.size === 0) return [];

  const defIndexes = [...owned].sort((a, b) => a - b);

  if (kind === "AGENT") {
    const rows = await prisma.csgoAgentCatalog.findMany({
      where: { defIndex: { in: defIndexes } },
      orderBy: { name: "asc" },
    });
    const byDef = new Map(rows.map((row) => [row.defIndex, row]));
    return defIndexes.map((defIndex) => {
      const row = byDef.get(defIndex);
      return {
        defIndex,
        name: row?.name ?? `Agent ${defIndex}`,
        imageUrl: row?.imageUrl ?? null,
        rarity: row?.rarity ?? "comum",
        subLabel: row?.team ?? null,
      };
    });
  }

  const rows = await prisma.csgoStickerCatalog.findMany({
    where: { defIndex: { in: defIndexes } },
    orderBy: { name: "asc" },
  });
  const byDef = new Map(rows.map((row) => [row.defIndex, row]));
  return defIndexes.map((defIndex) => {
    const row = byDef.get(defIndex);
    return {
      defIndex,
      name: row?.name ?? `Sticker ${defIndex}`,
      imageUrl: row?.imageUrl ?? null,
      rarity: row?.rarity ?? "comum",
      subLabel: row?.effect ?? null,
    };
  });
}

export async function listEconomyCatalogForUserGrant(
  userId: string,
  kind: "AGENT" | "STICKER",
  options: {
    page?: number;
    limit?: number;
    search?: string;
    ownership?: "all" | "owned" | "missing";
    team?: "T" | "CT";
  },
): Promise<{
  items: AdminGrantEconomyRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  ownedCount: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(72, Math.max(1, options.limit ?? 36));
  const search = options.search?.trim() ?? "";
  const ownership = options.ownership ?? "all";
  const owned = await ownedDefIndexesForKind(userId, kind);
  const ownedList = [...owned];

  if (kind === "AGENT") {
    const where = {
      enabled: true,
      ...(options.team ? { team: options.team } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              ...(Number.isFinite(Number(search)) ? [{ defIndex: Number(search) }] : []),
            ],
          }
        : {}),
      ...(ownership === "owned"
        ? ownedList.length > 0
          ? { defIndex: { in: ownedList } }
          : { defIndex: { in: [-1] } }
        : ownership === "missing" && ownedList.length > 0
          ? { defIndex: { notIn: ownedList } }
          : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.csgoAgentCatalog.count({ where }),
      prisma.csgoAgentCatalog.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        defIndex: row.defIndex,
        name: row.name,
        imageUrl: row.imageUrl,
        rarity: row.rarity,
        subLabel: row.team,
        ownedByUser: owned.has(row.defIndex),
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      ownedCount: ownedList.length,
    };
  }

  const stickerWhere = {
    enabled: true,
    imageUrl: { not: null },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            ...(Number.isFinite(Number(search)) ? [{ defIndex: Number(search) }] : []),
          ],
        }
      : {}),
    ...(ownership === "owned"
      ? ownedList.length > 0
        ? { defIndex: { in: ownedList } }
        : { defIndex: { in: [-1] } }
      : ownership === "missing" && ownedList.length > 0
        ? { defIndex: { notIn: ownedList } }
        : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.csgoStickerCatalog.count({ where: stickerWhere }),
    prisma.csgoStickerCatalog.findMany({
      where: stickerWhere,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      defIndex: row.defIndex,
      name: row.name,
      imageUrl: row.imageUrl,
      rarity: row.rarity,
      subLabel: row.effect,
      ownedByUser: owned.has(row.defIndex),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    ownedCount: ownedList.length,
  };
}

async function ensureEconomyCatalogEntry(
  kind: "AGENT" | "STICKER",
  defIndex: number,
): Promise<{ name: string }> {
  if (defIndex <= 0) {
    throw new CsgoApiError(`${kind === "AGENT" ? "Agente" : "Sticker"} inválido.`, 400);
  }

  if (kind === "AGENT") {
    const row = await prisma.csgoAgentCatalog.findUnique({ where: { defIndex } });
    if (!row) {
      throw new CsgoApiError("Agente não encontrado no catálogo.", 404);
    }
    if (!row.enabled) {
      throw new CsgoApiError("Agente desabilitado no catálogo.", 400);
    }
    return { name: row.name };
  }

  const row = await prisma.csgoStickerCatalog.findUnique({ where: { defIndex } });
  if (!row) {
    throw new CsgoApiError("Sticker não encontrado no catálogo.", 404);
  }
  if (!row.enabled) {
    throw new CsgoApiError("Sticker desabilitado no catálogo.", 400);
  }
  return { name: row.name };
}

export async function grantEconomyDefIndexToUser(
  adminId: string,
  userId: string,
  kind: "AGENT" | "STICKER",
  defIndex: number,
  options?: { skipAudit?: boolean },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true },
  });
  if (!user) {
    throw new CsgoApiError("Usuário não encontrado.", 404);
  }

  const { name } = await ensureEconomyCatalogEntry(kind, defIndex);
  const owned = await ownedDefIndexesForKind(userId, kind);
  if (owned.has(defIndex)) {
    return { ok: true as const, skipped: true as const, defIndex, name, userId };
  }

  await prisma.userEconomyGrant.create({
    data: {
      userId,
      kind,
      defIndex,
      source: "admin",
    },
  });

  if (!options?.skipAudit) {
    await logAdminAction({
      adminId,
      action: "INVENTORY_GRANT",
      targetType: "user",
      targetId: userId,
      summary: `Concedeu ${kind === "AGENT" ? "agente" : "sticker"} ${name} para ${user.nickname}`,
      metadata: { kind, defIndex },
    });
  }

  return { ok: true as const, skipped: false as const, defIndex, name, userId };
}

export async function grantEconomyDefIndexesToUserBulk(
  adminId: string,
  userId: string,
  kind: "AGENT" | "STICKER",
  defIndexes: number[],
) {
  const unique = [...new Set(defIndexes.filter((value) => value > 0))];
  if (unique.length === 0) {
    throw new CsgoApiError(
      `Selecione ao menos um ${kind === "AGENT" ? "agente" : "sticker"}.`,
      400,
    );
  }

  const granted: number[] = [];
  const skipped: number[] = [];

  for (const defIndex of unique) {
    const result = await grantEconomyDefIndexToUser(adminId, userId, kind, defIndex, {
      skipAudit: true,
    });
    if (result.skipped) skipped.push(defIndex);
    else granted.push(defIndex);
  }

  if (granted.length > 0) {
    await logAdminAction({
      adminId,
      action: "INVENTORY_GRANT",
      targetType: "user",
      targetId: userId,
      summary: `Concedidos ${granted.length} ${kind === "AGENT" ? "agente(s)" : "sticker(s)"} em lote (${skipped.length} já possuíam)`,
      metadata: { kind, defIndexes: granted, skipped },
    });
  }

  return {
    ok: true,
    granted,
    skipped,
    grantedCount: granted.length,
    skippedCount: skipped.length,
  };
}

export async function revokeEconomyDefIndexFromUser(
  adminId: string,
  userId: string,
  kind: "AGENT" | "STICKER",
  defIndex: number,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, steamId: true },
  });
  if (!user) {
    throw new CsgoApiError("Usuário não encontrado.", 404);
  }

  const { name } = await ensureEconomyCatalogEntry(kind, defIndex);

  await prisma.userEconomyGrant.deleteMany({
    where: { userId, kind, defIndex },
  });

  if (kind === "AGENT" && user.steamId) {
    const row = await prisma.csgoPlayerAgent.findUnique({
      where: { steamId: user.steamId },
    });
    if (row) {
      const agent = await prisma.csgoAgentCatalog.findUnique({ where: { defIndex } });
      const team = agent?.team;
      const updates: { agentT?: number; agentCT?: number } = {};
      if (row.agentT === defIndex && team === "T") updates.agentT = 0;
      if (row.agentCT === defIndex && team === "CT") updates.agentCT = 0;
      if (Object.keys(updates).length > 0) {
        await prisma.csgoPlayerAgent.update({
          where: { steamId: user.steamId },
          data: updates,
        });
      }
    }
  }

  if (kind === "STICKER" && user.steamId) {
    const rows = await prisma.csgoPlayerWeaponSticker.findMany({
      where: { steamId: user.steamId },
    });
    for (const row of rows) {
      const slots = [row.slot0, row.slot1, row.slot2, row.slot3, row.slot4];
      if (!slots.includes(defIndex)) continue;
      await prisma.csgoPlayerWeaponSticker.update({
        where: { id: row.id },
        data: {
          slot0: row.slot0 === defIndex ? 0 : row.slot0,
          slot1: row.slot1 === defIndex ? 0 : row.slot1,
          slot2: row.slot2 === defIndex ? 0 : row.slot2,
          slot3: row.slot3 === defIndex ? 0 : row.slot3,
          slot4: row.slot4 === defIndex ? 0 : row.slot4,
        },
      });
    }
  }

  await logAdminAction({
    adminId,
    action: "INVENTORY_REVOKE",
    targetType: "user",
    targetId: userId,
    summary: `Removeu ${kind === "AGENT" ? "agente" : "sticker"} ${name} de ${user.nickname}`,
    metadata: { kind, defIndex },
  });

  return { ok: true, defIndex, name, userId };
}
