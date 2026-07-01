import "server-only";

import type {
  Prisma,
  RankedSeason,
  RankedSeasonPrize,
  RankedSeasonRewardType,
  RankedSeasonStatus,
  StoreItemReward,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { creditCoins } from "@/lib/economy/wallet";
import { grantStoreRewardRow } from "@/lib/store/grant-reward";
import {
  LEADERBOARD_PARTICIPANT_WHERE,
  syncLeaderboardRanksWithClient,
} from "@/lib/leaderboard/sync-ranks-core";
import { resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { seedPlacementRecordsForSeason } from "@/lib/ranked/season-placement";
import { fetchCatalogPreviewImageMaps } from "@/lib/ranked/season-prize-display";
import {
  DUPLICATE_SEASON_PRIZE_COINS,
  notifyDuplicateSeasonPrizeCompensation,
  userAlreadyOwnsSeasonItemPrize,
} from "@/lib/ranked/duplicate-prize-compensation";
import { formatPixAmount } from "@/lib/ranked/pix-prize";
import {
  resolvePixPayoutStatusForUser,
  syncUserPixGrantStatuses,
} from "@/lib/ranked/pix-payout-service";
import { decryptField } from "@/lib/security/field-encryption";

let rankedSeasonTableReady: boolean | null = null;

function isMissingRankedSeasonTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2021"
  );
}

async function isRankedSeasonAvailable(): Promise<boolean> {
  if (rankedSeasonTableReady === true) return true;
  if (rankedSeasonTableReady === false) return false;
  try {
    await prisma.rankedSeason.findFirst({ select: { id: true } });
    rankedSeasonTableReady = true;
    return true;
  } catch (error) {
    if (isMissingRankedSeasonTable(error)) {
      rankedSeasonTableReady = false;
      return false;
    }
    throw error;
  }
}

function rankedSeasonMigrationError(): RankedSeasonError {
  return new RankedSeasonError(
    "Sistema de temporadas não migrado. Execute: npx prisma migrate deploy",
    503,
  );
}

export class RankedSeasonError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "RankedSeasonError";
  }
}

const LEADERBOARD_ORDER: Prisma.UserOrderByWithRelationInput[] = [
  { competitivePoints: "desc" },
  { rankedWins: "desc" },
  { elo: "desc" },
];

export const USER_RANKED_RESET: Prisma.UserUpdateManyMutationInput = {
  rank: 0,
  elo: 1000,
  kd: 0,
  competitivePoints: 0,
  rankedWins: 0,
  rankedLosses: 0,
  rankedKills: 0,
  rankedDeaths: 0,
  rankedAssists: 0,
  rankedMvps: 0,
  rankedHeadshots: 0,
  rankedDamage: 0,
  rankedRoundsPlayed: 0,
  rankedClutches: 0,
  rankedUtilityDamage: 0,
  rankedEnemiesFlashed: 0,
  rankedAwpKills: 0,
  winRate: 0,
};

export type RankedSeasonPrizeInput = {
  id?: string;
  position: number;
  sortOrder?: number;
  rewardType: RankedSeasonRewardType;
  amountCoins?: number;
  pixAmountCents?: number;
  catalogSkinId?: string | null;
  agentDefIndex?: number | null;
  stickerDefIndex?: number | null;
  label?: string;
  enabled?: boolean;
  highlight?: boolean;
};

export type CreateRankedSeasonInput = {
  name: string;
  seasonNumber: number;
  description?: string;
  startsAt: Date;
  endsAt?: Date | null;
  resetAt?: Date | null;
  activate?: boolean;
  prizes?: RankedSeasonPrizeInput[];
};

export type UpdateRankedSeasonInput = Partial<
  Omit<CreateRankedSeasonInput, "prizes" | "activate">
> & {
  status?: RankedSeasonStatus;
};

export type ResetSeasonInput = {
  grantPrizes?: boolean;
  archiveStandings?: boolean;
  nextSeason?: CreateRankedSeasonInput;
};

export type SerializedRankedSeason = {
  id: string;
  code: string;
  name: string;
  seasonNumber: number;
  description: string;
  startsAt: string;
  endsAt: string | null;
  resetAt: string | null;
  status: RankedSeasonStatus;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  prizes: SerializedRankedSeasonPrize[];
  standingsCount?: number;
  prizeGrantsCount?: number;
};

export type SerializedRankedSeasonPrize = {
  id: string;
  position: number;
  sortOrder: number;
  rewardType: RankedSeasonRewardType;
  amountCoins: number;
  pixAmountCents: number;
  catalogSkinId: string | null;
  agentDefIndex: number | null;
  stickerDefIndex: number | null;
  label: string;
  enabled: boolean;
  highlight: boolean;
  previewImageUrl?: string | null;
};

export type SerializedRankedSeasonStanding = {
  id: string;
  position: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  elo: number;
  competitivePoints: number;
  rankedWins: number;
  rankedLosses: number;
  rankedKills: number;
  rankedDeaths: number;
  kd: number;
};

export type PublicRankedSeasonOption = {
  id: string;
  name: string;
  seasonNumber: number;
  active: boolean;
  archived: boolean;
  status: RankedSeasonStatus;
};

function slugifyCode(seasonNumber: number): string {
  return `season-${seasonNumber}`;
}

function defaultPrizeLabel(position: number): string {
  return `${position}º lugar`;
}

function serializePrize(prize: RankedSeasonPrize): SerializedRankedSeasonPrize {
  return {
    id: prize.id,
    position: prize.position,
    sortOrder: prize.sortOrder,
    rewardType: prize.rewardType,
    amountCoins: prize.amountCoins,
    pixAmountCents: prize.pixAmountCents,
    catalogSkinId: prize.catalogSkinId,
    agentDefIndex: prize.agentDefIndex,
    stickerDefIndex: prize.stickerDefIndex,
    label: prize.label,
    enabled: prize.enabled,
    highlight: prize.highlight,
    previewImageUrl: null,
  };
}

async function enrichSerializedPrizesWithPreviews(
  prizes: SerializedRankedSeasonPrize[],
): Promise<SerializedRankedSeasonPrize[]> {
  if (prizes.length === 0) return prizes;

  const maps = await fetchCatalogPreviewImageMaps({
    catalogSkinIds: prizes
      .map((prize) => prize.catalogSkinId)
      .filter((id): id is string => Boolean(id)),
    agentDefIndexes: prizes
      .map((prize) => prize.agentDefIndex)
      .filter((value): value is number => value != null && value > 0),
    stickerDefIndexes: prizes
      .map((prize) => prize.stickerDefIndex)
      .filter((value): value is number => value != null && value > 0),
  });

  return prizes.map((prize) => {
    if (prize.rewardType === "COINS" || prize.rewardType === "PIX") return prize;

    let previewImageUrl: string | null = null;
    if (prize.rewardType === "CATALOG_SKIN" && prize.catalogSkinId) {
      previewImageUrl = maps.skins.get(prize.catalogSkinId) ?? null;
    } else if (prize.rewardType === "AGENT" && prize.agentDefIndex) {
      previewImageUrl = maps.agents.get(prize.agentDefIndex) ?? null;
    } else if (prize.rewardType === "STICKER" && prize.stickerDefIndex) {
      previewImageUrl = maps.stickers.get(prize.stickerDefIndex) ?? null;
    }

    return previewImageUrl ? { ...prize, previewImageUrl } : prize;
  });
}

async function enrichSeasonsWithPrizePreviews(
  seasons: SerializedRankedSeason[],
): Promise<SerializedRankedSeason[]> {
  const allPrizes = seasons.flatMap((season) => season.prizes);
  const enriched = await enrichSerializedPrizesWithPreviews(allPrizes);
  const byId = new Map(enriched.map((prize) => [prize.id, prize]));

  return seasons.map((season) => ({
    ...season,
    prizes: season.prizes.map((prize) => byId.get(prize.id) ?? prize),
  }));
}

const PRIZE_ORDER_BY = [
  { position: "asc" as const },
  { sortOrder: "asc" as const },
  { createdAt: "asc" as const },
];

export function serializeRankedSeason(
  season: RankedSeason & { prizes?: RankedSeasonPrize[] },
  extras?: { standingsCount?: number; prizeGrantsCount?: number },
): SerializedRankedSeason {
  return {
    id: season.id,
    code: season.code,
    name: season.name,
    seasonNumber: season.seasonNumber,
    description: season.description,
    startsAt: season.startsAt.toISOString(),
    endsAt: season.endsAt?.toISOString() ?? null,
    resetAt: season.resetAt?.toISOString() ?? null,
    status: season.status,
    active: season.active,
    createdAt: season.createdAt.toISOString(),
    updatedAt: season.updatedAt.toISOString(),
    prizes: (season.prizes ?? [])
      .map(serializePrize)
      .sort(
        (a, b) =>
          a.position - b.position || a.sortOrder - b.sortOrder,
      ),
    standingsCount: extras?.standingsCount,
    prizeGrantsCount: extras?.prizeGrantsCount,
  };
}

export async function getActiveRankedSeasonId(): Promise<string | null> {
  if (!(await isRankedSeasonAvailable())) return null;
  const season = await prisma.rankedSeason.findFirst({
    where: { active: true, status: "ACTIVE" },
    select: { id: true },
    orderBy: { seasonNumber: "desc" },
  });
  return season?.id ?? null;
}

export async function getActiveRankedSeason() {
  if (!(await isRankedSeasonAvailable())) return null;
  return prisma.rankedSeason.findFirst({
    where: { active: true, status: "ACTIVE" },
    include: { prizes: { orderBy: PRIZE_ORDER_BY } },
    orderBy: { seasonNumber: "desc" },
  });
}

export async function listRankedSeasons() {
  if (!(await isRankedSeasonAvailable())) return [];
  const seasons = await prisma.rankedSeason.findMany({
    include: {
      prizes: { orderBy: PRIZE_ORDER_BY },
      _count: { select: { standings: true, prizeGrants: true } },
    },
    orderBy: [{ seasonNumber: "desc" }, { createdAt: "desc" }],
  });

  return enrichSeasonsWithPrizePreviews(
    seasons.map((season) =>
      serializeRankedSeason(season, {
        standingsCount: season._count.standings,
        prizeGrantsCount: season._count.prizeGrants,
      }),
    ),
  );
}

export async function getRankedSeasonById(seasonId: string) {
  if (!(await isRankedSeasonAvailable())) return null;
  const season = await prisma.rankedSeason.findUnique({
    where: { id: seasonId },
    include: {
      prizes: { orderBy: PRIZE_ORDER_BY },
      _count: { select: { standings: true, prizeGrants: true } },
    },
  });
  if (!season) return null;
  const serialized = serializeRankedSeason(season, {
    standingsCount: season._count.standings,
    prizeGrantsCount: season._count.prizeGrants,
  });
  const [enriched] = await enrichSeasonsWithPrizePreviews([serialized]);
  return enriched ?? serialized;
}

async function ensureUniqueSeasonNumber(seasonNumber: number, excludeId?: string) {
  const existing = await prisma.rankedSeason.findFirst({
    where: {
      seasonNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new RankedSeasonError(`Já existe uma temporada com número ${seasonNumber}.`);
  }
}

async function ensureUniqueCode(code: string, excludeId?: string) {
  const existing = await prisma.rankedSeason.findFirst({
    where: {
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new RankedSeasonError(`Código "${code}" já está em uso.`);
  }
}

function buildDefaultPrizes(seasonId: string): Prisma.RankedSeasonPrizeCreateManyInput[] {
  return [1, 2, 3].map((position, index) => ({
    seasonId,
    position,
    sortOrder: index,
    rewardType: "COINS" as const,
    label: defaultPrizeLabel(position),
    enabled: false,
  }));
}

function validatePrizeInput(prize: RankedSeasonPrizeInput) {
  if (prize.position < 1 || prize.position > 3) {
    throw new RankedSeasonError("Premiação só pode ser configurada para o top 3.");
  }
  switch (prize.rewardType) {
    case "COINS":
      if ((prize.amountCoins ?? 0) <= 0) {
        throw new RankedSeasonError(`Moedas inválidas para ${prize.position}º lugar.`);
      }
      break;
    case "PIX":
      if ((prize.pixAmountCents ?? 0) <= 0) {
        throw new RankedSeasonError(`Valor Pix inválido para ${prize.position}º lugar.`);
      }
      break;
    case "CATALOG_SKIN":
      if (!prize.catalogSkinId) {
        throw new RankedSeasonError(`Skin obrigatória para ${prize.position}º lugar.`);
      }
      break;
    case "AGENT":
      if (!prize.agentDefIndex || prize.agentDefIndex <= 0) {
        throw new RankedSeasonError(`Agente inválido para ${prize.position}º lugar.`);
      }
      break;
    case "STICKER":
      if (!prize.stickerDefIndex || prize.stickerDefIndex <= 0) {
        throw new RankedSeasonError(`Sticker inválido para ${prize.position}º lugar.`);
      }
      break;
    default: {
      const _never: never = prize.rewardType;
      throw new RankedSeasonError(`Tipo de prêmio não suportado: ${_never}`);
    }
  }
}

export async function createRankedSeason(input: CreateRankedSeasonInput) {
  if (!(await isRankedSeasonAvailable())) {
    throw rankedSeasonMigrationError();
  }
  await ensureUniqueSeasonNumber(input.seasonNumber);
  const code = slugifyCode(input.seasonNumber);
  await ensureUniqueCode(code);

  const seasonId = `season-${input.seasonNumber}-${Date.now()}`;

  const season = await prisma.$transaction(async (tx) => {
    if (input.activate) {
      const currentActive = await tx.rankedSeason.findFirst({
        where: { active: true },
        select: { id: true, name: true },
      });
      if (currentActive) {
        const rankedPlayers = await tx.user.count({ where: LEADERBOARD_PARTICIPANT_WHERE });
        if (rankedPlayers > 0) {
          throw new RankedSeasonError(
            `A temporada «${currentActive.name}» ainda tem jogadores rankeados. Use «Reset completo» para arquivar o ranking, zerar stats e só então iniciar a próxima season.`,
          );
        }
        await tx.rankedSeason.update({
          where: { id: currentActive.id },
          data: { active: false, status: "ARCHIVED" },
        });
      } else {
        await tx.rankedSeason.updateMany({
          where: { active: true },
          data: { active: false, status: "ENDED" },
        });
      }
    }

    const created = await tx.rankedSeason.create({
      data: {
        id: seasonId,
        code,
        name: input.name.trim(),
        seasonNumber: input.seasonNumber,
        description: input.description?.trim() ?? "",
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        resetAt: input.resetAt ?? null,
        status: input.activate ? "ACTIVE" : "DRAFT",
        active: input.activate ?? false,
      },
    });

    const prizeRows =
      input.prizes && input.prizes.length > 0
        ? input.prizes.map((prize, index) => {
            if (prize.enabled !== false) validatePrizeInput(prize);
            return {
              seasonId: created.id,
              position: prize.position,
              sortOrder: prize.sortOrder ?? index,
              rewardType: prize.rewardType,
              amountCoins: prize.amountCoins ?? 0,
              pixAmountCents: prize.pixAmountCents ?? 0,
              catalogSkinId: prize.catalogSkinId ?? null,
              agentDefIndex: prize.agentDefIndex ?? null,
              stickerDefIndex: prize.stickerDefIndex ?? null,
              label: prize.label?.trim() || defaultPrizeLabel(prize.position),
              enabled: prize.enabled ?? true,
              highlight: prize.highlight ?? false,
            };
          })
        : buildDefaultPrizes(created.id);

    await tx.rankedSeasonPrize.createMany({ data: prizeRows });

    return tx.rankedSeason.findUniqueOrThrow({
      where: { id: created.id },
      include: { prizes: { orderBy: PRIZE_ORDER_BY } },
    });
  });

  return serializeRankedSeason(season);
}

export async function updateRankedSeason(seasonId: string, input: UpdateRankedSeasonInput) {
  const existing = await prisma.rankedSeason.findUnique({ where: { id: seasonId } });
  if (!existing) throw new RankedSeasonError("Temporada não encontrada.", 404);

  if (input.seasonNumber !== undefined && input.seasonNumber !== existing.seasonNumber) {
    await ensureUniqueSeasonNumber(input.seasonNumber, seasonId);
  }

  const season = await prisma.rankedSeason.update({
    where: { id: seasonId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.seasonNumber !== undefined ? { seasonNumber: input.seasonNumber } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      ...(input.resetAt !== undefined ? { resetAt: input.resetAt } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: { prizes: { orderBy: PRIZE_ORDER_BY } },
  });

  return serializeRankedSeason(season);
}

export async function activateRankedSeason(seasonId: string) {
  const season = await prisma.rankedSeason.findUnique({ where: { id: seasonId } });
  if (!season) throw new RankedSeasonError("Temporada não encontrada.", 404);
  if (season.status === "ARCHIVED") {
    throw new RankedSeasonError("Temporadas arquivadas não podem ser reativadas.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.rankedSeason.updateMany({
      where: { active: true, id: { not: seasonId } },
      data: { active: false, status: "ENDED" },
    });

    return tx.rankedSeason.update({
      where: { id: seasonId },
      data: { active: true, status: "ACTIVE" },
      include: { prizes: { orderBy: PRIZE_ORDER_BY } },
    });
  });

  return serializeRankedSeason(updated);
}

export async function upsertRankedSeasonPrizes(
  seasonId: string,
  prizes: RankedSeasonPrizeInput[],
) {
  const season = await prisma.rankedSeason.findUnique({ where: { id: seasonId } });
  if (!season) throw new RankedSeasonError("Temporada não encontrada.", 404);

  for (const prize of prizes) {
    if (prize.enabled !== false) validatePrizeInput(prize);
  }

  const keptIds = prizes.map((prize) => prize.id).filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.rankedSeasonPrize.deleteMany({
      where: {
        seasonId,
        ...(keptIds.length > 0 ? { id: { notIn: keptIds } } : {}),
      },
    });

    for (let index = 0; index < prizes.length; index++) {
      const prize = prizes[index]!;
      const data = {
        position: prize.position,
        sortOrder: prize.sortOrder ?? index,
        rewardType: prize.rewardType,
        amountCoins: prize.amountCoins ?? 0,
        pixAmountCents: prize.pixAmountCents ?? 0,
        catalogSkinId: prize.catalogSkinId ?? null,
        agentDefIndex: prize.agentDefIndex ?? null,
        stickerDefIndex: prize.stickerDefIndex ?? null,
        label: prize.label?.trim() || defaultPrizeLabel(prize.position),
        enabled: prize.enabled ?? true,
        highlight: prize.highlight ?? false,
      };

      if (prize.id) {
        await tx.rankedSeasonPrize.update({
          where: { id: prize.id },
          data,
        });
      } else {
        await tx.rankedSeasonPrize.create({
          data: {
            seasonId,
            ...data,
          },
        });
      }
    }
  });

  return getRankedSeasonById(seasonId);
}

async function notifySeasonPrize(userId: string, seasonName: string, position: number, label: string) {
  await prisma.notification.create({
    data: {
      userId,
      title: "Premiação de temporada",
      body: `Parabéns! Você ficou em ${position}º na ${seasonName} e recebeu: ${label}.`,
      type: "SYSTEM",
      params: { seasonName, position, label, action: "ranking" },
    },
  });
}

async function notifyPixSeasonPrize(
  userId: string,
  seasonName: string,
  position: number,
  pixAmountCents: number,
  label: string,
) {
  const amount = formatPixAmount(pixAmountCents);
  await prisma.notification.create({
    data: {
      userId,
      title: "Premiação Pix da temporada",
      body: `Parabéns! Você ficou em ${position}º na ${seasonName} e ganhou ${amount} via Pix. Nossa equipe entrará em contato para efetuar o pagamento.`,
      type: "SYSTEM",
      params: {
        seasonName,
        position,
        label,
        pixAmountCents,
        rewardType: "PIX",
        action: "ranking",
      },
    },
  });
}

function prizeToStoreReward(prize: RankedSeasonPrize): StoreItemReward {
  return {
    kind:
      prize.rewardType === "CATALOG_SKIN"
        ? "CATALOG_SKIN"
        : prize.rewardType === "AGENT"
          ? "AGENT"
          : "STICKER",
    catalogSkinId: prize.catalogSkinId,
    agentDefIndex: prize.agentDefIndex,
    stickerDefIndex: prize.stickerDefIndex,
  } as unknown as StoreItemReward;
}

async function grantSinglePrize(
  userId: string,
  season: RankedSeason,
  prize: RankedSeasonPrize,
  adminId?: string,
): Promise<{ granted: boolean; reason?: string }> {
  const existing = await prisma.rankedSeasonPrizeGrant.findUnique({
    where: {
      seasonId_userId_prizeId: {
        seasonId: season.id,
        userId,
        prizeId: prize.id,
      },
    },
  });
  if (existing) return { granted: false, reason: "already_granted" };
  if (!prize.enabled) return { granted: false, reason: "disabled" };

  const label = prize.label || defaultPrizeLabel(prize.position);

  if (prize.rewardType === "COINS") {
    await prisma.$transaction(async (tx) => {
      await creditCoins(tx, {
        userId,
        amount: prize.amountCoins,
        kind: "EARN_SEASON_PRIZE",
        reason: `${season.name}: ${label}`,
        metadata: { seasonId: season.id, position: prize.position },
      });
      await tx.rankedSeasonPrizeGrant.create({
        data: {
          seasonId: season.id,
          userId,
          position: prize.position,
          prizeId: prize.id,
          rewardType: prize.rewardType,
          amountCoins: prize.amountCoins,
          label,
          grantedByAdminId: adminId ?? null,
        },
      });
    });
    await notifySeasonPrize(userId, season.name, prize.position, label);
    return { granted: true };
  }

  if (prize.rewardType === "PIX") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pixKey: true },
    });
    const pixPayoutStatus = resolvePixPayoutStatusForUser(
      user?.pixKey ? decryptField(user.pixKey) : "",
    );

    await prisma.rankedSeasonPrizeGrant.create({
      data: {
        seasonId: season.id,
        userId,
        position: prize.position,
        prizeId: prize.id,
        rewardType: prize.rewardType,
        pixAmountCents: prize.pixAmountCents,
        label,
        pixPayoutStatus,
        grantedByAdminId: adminId ?? null,
      },
    });
    await notifyPixSeasonPrize(userId, season.name, prize.position, prize.pixAmountCents, label);
    return { granted: true };
  }

  {
    const alreadyOwned = await userAlreadyOwnsSeasonItemPrize(userId, prize);

    if (alreadyOwned) {
      await prisma.$transaction(async (tx) => {
        await creditCoins(tx, {
          userId,
          amount: DUPLICATE_SEASON_PRIZE_COINS,
          kind: "EARN_SEASON_PRIZE",
          reason: `${season.name}: duplicado — ${label}`,
          metadata: {
            seasonId: season.id,
            position: prize.position,
            prizeId: prize.id,
            duplicate: true,
            rewardType: prize.rewardType,
          },
        });
        await tx.rankedSeasonPrizeGrant.create({
          data: {
            seasonId: season.id,
            userId,
            position: prize.position,
            prizeId: prize.id,
            rewardType: prize.rewardType,
            amountCoins: DUPLICATE_SEASON_PRIZE_COINS,
            catalogSkinId: prize.catalogSkinId,
            agentDefIndex: prize.agentDefIndex,
            stickerDefIndex: prize.stickerDefIndex,
            label: `${label} (duplicado → ${DUPLICATE_SEASON_PRIZE_COINS.toLocaleString("pt-BR")} moedas)`,
            grantedByAdminId: adminId ?? null,
          },
        });
      });

      await notifyDuplicateSeasonPrizeCompensation(
        userId,
        season.name,
        prize.position,
        label,
        DUPLICATE_SEASON_PRIZE_COINS,
      );
      return { granted: true };
    }

    await grantStoreRewardRow(userId, prizeToStoreReward(prize), {
      notifySkin: true,
      grantSource: "season_prize",
    });
    await prisma.rankedSeasonPrizeGrant.create({
      data: {
        seasonId: season.id,
        userId,
        position: prize.position,
        prizeId: prize.id,
        rewardType: prize.rewardType,
        catalogSkinId: prize.catalogSkinId,
        agentDefIndex: prize.agentDefIndex,
        stickerDefIndex: prize.stickerDefIndex,
        label,
        grantedByAdminId: adminId ?? null,
      },
    });
  }

  await notifySeasonPrize(userId, season.name, prize.position, label);
  return { granted: true };
}

export async function archiveSeasonStandings(seasonId: string, options?: { force?: boolean }) {
  const existingCount = await prisma.rankedSeasonStanding.count({ where: { seasonId } });
  if (existingCount > 0 && !options?.force) {
    return existingCount;
  }

  await syncLeaderboardRanksWithClient(prisma);

  const participants = await prisma.user.findMany({
    where: LEADERBOARD_PARTICIPANT_WHERE,
    orderBy: LEADERBOARD_ORDER,
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      avatarPreset: true,
      steamAvatarUrl: true,
      rank: true,
      elo: true,
      competitivePoints: true,
      rankedWins: true,
      rankedLosses: true,
      rankedKills: true,
      rankedDeaths: true,
      kd: true,
    },
  });

  if (participants.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    await tx.rankedSeasonStanding.deleteMany({ where: { seasonId } });

    await tx.rankedSeasonStanding.createMany({
      data: participants.map((user, index) => ({
        seasonId,
        userId: user.id,
        position: user.rank > 0 ? user.rank : index + 1,
        nickname: user.nickname,
        avatarUrl: resolveUserAvatarUrl(user),
        elo: user.elo,
        competitivePoints: user.competitivePoints,
        rankedWins: user.rankedWins,
        rankedLosses: user.rankedLosses,
        rankedKills: user.rankedKills,
        rankedDeaths: user.rankedDeaths,
        kd: user.kd,
      })),
    });
  });

  return participants.length;
}

export async function grantSeasonPrizes(seasonId: string, adminId?: string) {
  const season = await prisma.rankedSeason.findUnique({
    where: { id: seasonId },
    include: { prizes: { where: { enabled: true }, orderBy: PRIZE_ORDER_BY } },
  });
  if (!season) throw new RankedSeasonError("Temporada não encontrada.", 404);
  if (season.prizes.length === 0) {
    throw new RankedSeasonError("Nenhuma premiação habilitada para esta temporada.");
  }

  let standings = await prisma.rankedSeasonStanding.findMany({
    where: { seasonId },
    orderBy: { position: "asc" },
    take: 3,
  });

  if (standings.length === 0) {
    await archiveSeasonStandings(seasonId);
    standings = await prisma.rankedSeasonStanding.findMany({
      where: { seasonId },
      orderBy: { position: "asc" },
      take: 3,
    });
  }

  const results: Array<{ position: number; userId: string; granted: boolean; reason?: string }> = [];

  for (const prize of season.prizes) {
    const standing = standings.find((s) => s.position === prize.position);
    if (!standing) {
      results.push({ position: prize.position, userId: "", granted: false, reason: "no_standing" });
      continue;
    }
    const result = await grantSinglePrize(standing.userId, season, prize, adminId);
    results.push({
      position: prize.position,
      userId: standing.userId,
      granted: result.granted,
      reason: result.reason,
    });
  }

  return { seasonId, results };
}

export async function resetRankedSeason(
  seasonId: string,
  adminId?: string,
  options: ResetSeasonInput = {},
) {
  const season = await prisma.rankedSeason.findUnique({
    where: { id: seasonId },
    include: { prizes: { orderBy: PRIZE_ORDER_BY } },
  });
  if (!season) throw new RankedSeasonError("Temporada não encontrada.", 404);
  if (season.status === "ARCHIVED") {
    throw new RankedSeasonError("Esta temporada já foi arquivada.");
  }

  const grantPrizes = options.grantPrizes ?? true;
  const archiveStandings = options.archiveStandings ?? true;
  const shouldResetUserStats =
    season.active || Boolean(options.nextSeason) || archiveStandings;

  if (archiveStandings) {
    await archiveSeasonStandings(seasonId, { force: false });
  }

  let prizeResults: Awaited<ReturnType<typeof grantSeasonPrizes>> | null = null;
  if (grantPrizes) {
    prizeResults = await grantSeasonPrizes(seasonId, adminId);
  }

  await prisma.rankedSeason.update({
    where: { id: seasonId },
    data: { active: false, status: "ARCHIVED" },
  });

  if (shouldResetUserStats) {
    await prisma.$transaction(async (tx) => {
      await tx.userRankedSeasonPlacement.deleteMany({});
      await tx.user.updateMany({ data: USER_RANKED_RESET });
    });
    await syncLeaderboardRanksWithClient(prisma);
  }

  let nextSeason: SerializedRankedSeason | null = null;
  if (options.nextSeason) {
    nextSeason = await createRankedSeason({
      ...options.nextSeason,
      activate: true,
    });
    await seedPlacementRecordsForSeason(nextSeason.id, seasonId);
  }

  return { archivedSeasonId: seasonId, prizeResults, nextSeason, statsReset: shouldResetUserStats };
}

/** Full end-of-season flow: archive, grant prizes, reset stats, optionally start next season. */
export async function endAndResetActiveSeason(
  adminId?: string,
  options: ResetSeasonInput = {},
) {
  const active = await prisma.rankedSeason.findFirst({
    where: { active: true, status: "ACTIVE" },
  });
  if (!active) throw new RankedSeasonError("Nenhuma temporada ativa para encerrar.");

  const grantPrizes = options.grantPrizes ?? true;
  const archiveStandings = options.archiveStandings ?? true;

  if (archiveStandings) {
    await archiveSeasonStandings(active.id);
  }

  let prizeResults: Awaited<ReturnType<typeof grantSeasonPrizes>> | null = null;
  if (grantPrizes) {
    prizeResults = await grantSeasonPrizes(active.id, adminId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.rankedSeason.update({
      where: { id: active.id },
      data: { active: false, status: "ARCHIVED" },
    });
    await tx.userRankedSeasonPlacement.deleteMany({});
    await tx.user.updateMany({ data: USER_RANKED_RESET });
  });

  await syncLeaderboardRanksWithClient(prisma);

  let nextSeason: SerializedRankedSeason | null = null;
  if (options.nextSeason) {
    nextSeason = await createRankedSeason({
      ...options.nextSeason,
      activate: true,
    });
    await seedPlacementRecordsForSeason(nextSeason.id, active.id);
  }

  return {
    endedSeasonId: active.id,
    prizeResults,
    nextSeason,
  };
}

export async function listPublicRankedSeasons(): Promise<PublicRankedSeasonOption[]> {
  if (!(await isRankedSeasonAvailable())) return [];

  const seasons = await prisma.rankedSeason.findMany({
    where: {
      status: { in: ["ACTIVE", "ENDED", "ARCHIVED"] },
    },
    select: {
      id: true,
      name: true,
      seasonNumber: true,
      active: true,
      status: true,
    },
    orderBy: [{ seasonNumber: "desc" }, { createdAt: "desc" }],
  });

  return seasons.map((season) => ({
    id: season.id,
    name: season.name,
    seasonNumber: season.seasonNumber,
    active: season.active,
    archived: season.status === "ARCHIVED",
    status: season.status,
  }));
}

export async function listSeasonStandings(
  seasonId: string,
  limit = 100,
): Promise<SerializedRankedSeasonStanding[]> {
  if (!(await isRankedSeasonAvailable())) return [];
  const rows = await prisma.rankedSeasonStanding.findMany({
    where: { seasonId },
    orderBy: { position: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    position: row.position,
    userId: row.userId,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    elo: row.elo,
    competitivePoints: row.competitivePoints,
    rankedWins: row.rankedWins,
    rankedLosses: row.rankedLosses,
    rankedKills: row.rankedKills,
    rankedDeaths: row.rankedDeaths,
    kd: row.kd,
  }));
}

/**
 * Apaga todas as temporadas, snapshots, placements e prêmios; zera stats rankeados;
 * cria uma Season 1 limpa e ativa.
 */
export async function hardResetRankedSeasonSystem(input?: {
  seasonName?: string;
  seasonNumber?: number;
}): Promise<{
  deletedSeasons: number;
  usersReset: number;
  season: SerializedRankedSeason;
}> {
  if (!(await isRankedSeasonAvailable())) {
    throw rankedSeasonMigrationError();
  }

  const deletedSeasons = await prisma.rankedSeason.count();

  await prisma.$transaction(async (tx) => {
    await tx.userRankedSeasonPlacement.deleteMany({});
    await tx.rankedSeasonPrizeGrant.deleteMany({});
    await tx.rankedSeasonStanding.deleteMany({});
    await tx.rankedSeasonPrize.deleteMany({});
    await tx.rankedMatchSession.updateMany({ data: { seasonId: null } });
    await tx.rankedSeason.deleteMany({});
    await tx.user.updateMany({ data: USER_RANKED_RESET });
  });

  await syncLeaderboardRanksWithClient(prisma);

  const season = await createRankedSeason({
    name: input?.seasonName ?? "Season 1",
    seasonNumber: input?.seasonNumber ?? 1,
    description: "Temporada reiniciada — ranking zerado.",
    startsAt: new Date(),
    activate: true,
  });

  return {
    deletedSeasons,
    usersReset: await prisma.user.count(),
    season,
  };
}

export function formatSeasonDuration(
  startsAt: Date,
  endsAt: Date | null,
  locale = "pt-BR",
): string {
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  if (!endsAt) return `Desde ${fmt.format(startsAt)}`;
  return `${fmt.format(startsAt)} — ${fmt.format(endsAt)}`;
}

export async function getPublicActiveSeasonSummary() {
  try {
    const season = await getActiveRankedSeason();
    if (!season) return null;

    const prizes = season.prizes.filter((p) => p.enabled).map(serializePrize);

    return {
      ...serializeRankedSeason(season),
      durationLabel: formatSeasonDuration(season.startsAt, season.endsAt),
      prizes,
    };
  } catch {
    return null;
  }
}
