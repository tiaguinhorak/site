import "server-only";

import type {
  BattlePassTrack,
  BattlePassRewardType,
  StoreItemReward,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { creditCoins, debitCoins, InsufficientCoinsError, type DbClient } from "@/lib/economy/wallet";
import { grantStoreRewardRow } from "@/lib/store/grant-reward";

const SEASON_CODE = "season-1";
const MAX_LEVEL = 40;
const XP_PER_LEVEL = 1000;
const PREMIUM_COST_COINS = 5000;

let seeded = false;

/** Create the default battle pass season + reward tracks if missing. */
export async function ensureBattlePassSeeded(): Promise<void> {
  if (seeded) return;

  const existing = await prisma.battlePassSeason.findUnique({ where: { code: SEASON_CODE } });
  let seasonId = existing?.id;

  if (!existing) {
    const season = await prisma.battlePassSeason.create({
      data: {
        code: SEASON_CODE,
        name: "Passe de Batalha — Temporada 1",
        seasonNumber: 1,
        maxLevel: MAX_LEVEL,
        xpPerLevel: XP_PER_LEVEL,
        premiumCostCoins: PREMIUM_COST_COINS,
      },
    });
    seasonId = season.id;
  }

  const rewardCount = await prisma.battlePassReward.count({ where: { seasonId } });
  if (rewardCount === 0 && seasonId) {
    const rows: {
      seasonId: string;
      level: number;
      track: BattlePassTrack;
      rewardType: BattlePassRewardType;
      amountCoins: number;
      label: string;
      icon: string;
    }[] = [];
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const freeCoins = 100 + level * 10;
      rows.push({
        seasonId,
        level,
        track: "FREE",
        rewardType: "COINS",
        amountCoins: freeCoins,
        label: `${freeCoins} moedas`,
        icon: "Coins",
      });
      const premiumCoins = 250 + level * 25;
      rows.push({
        seasonId,
        level,
        track: "PREMIUM",
        rewardType: "COINS",
        amountCoins: premiumCoins,
        label: `${premiumCoins} moedas`,
        icon: "Coins",
      });
    }
    await prisma.battlePassReward.createMany({ data: rows });
  }

  seeded = true;
}

function levelForBpXp(xp: number, xpPerLevel: number, maxLevel: number): number {
  return Math.max(1, Math.min(maxLevel, Math.floor(xp / xpPerLevel) + 1));
}

/** Add battle-pass XP to the active season for a user (auto-creates their pass). */
export async function addBattlePassXp(userId: string, amount: number): Promise<void> {
  const delta = Math.max(0, Math.floor(amount));
  if (delta === 0) return;

  await ensureBattlePassSeeded();
  const season = await prisma.battlePassSeason.findFirst({ where: { active: true } });
  if (!season) return;

  const existing = await prisma.userBattlePass.findUnique({
    where: { userId_seasonId: { userId, seasonId: season.id } },
  });

  if (!existing) {
    await prisma.userBattlePass.create({
      data: {
        userId,
        seasonId: season.id,
        xp: delta,
        level: levelForBpXp(delta, season.xpPerLevel, season.maxLevel),
      },
    });
    return;
  }

  const newXp = existing.xp + delta;
  await prisma.userBattlePass.update({
    where: { id: existing.id },
    data: { xp: newXp, level: levelForBpXp(newXp, season.xpPerLevel, season.maxLevel) },
  });
}

export type BattlePassRewardView = {
  id: string;
  level: number;
  track: BattlePassTrack;
  rewardType: BattlePassRewardType;
  label: string;
  icon: string | null;
  amountCoins: number;
  claimable: boolean;
  claimed: boolean;
  locked: boolean;
};

export type BattlePassView = {
  season: {
    id: string;
    name: string;
    seasonNumber: number;
    maxLevel: number;
    xpPerLevel: number;
    premiumCostCoins: number;
    endsAt: string | null;
  };
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  premium: boolean;
  rewards: BattlePassRewardView[];
} | null;

export async function getBattlePassView(userId: string): Promise<BattlePassView> {
  await ensureBattlePassSeeded();
  const season = await prisma.battlePassSeason.findFirst({
    where: { active: true },
    include: { rewards: { orderBy: [{ level: "asc" }, { track: "asc" }] } },
  });
  if (!season) return null;

  const pass = await prisma.userBattlePass.findUnique({
    where: { userId_seasonId: { userId, seasonId: season.id } },
  });
  const claims = await prisma.userBattlePassClaim.findMany({
    where: { userId, reward: { seasonId: season.id } },
    select: { rewardId: true },
  });
  const claimedIds = new Set(claims.map((c) => c.rewardId));

  const level = pass?.level ?? 1;
  const premium = pass?.premium ?? false;
  const xp = pass?.xp ?? 0;

  const rewards: BattlePassRewardView[] = season.rewards.map((r) => {
    const reachedLevel = level >= r.level;
    const trackAllowed = r.track === "FREE" || premium;
    const claimed = claimedIds.has(r.id);
    return {
      id: r.id,
      level: r.level,
      track: r.track,
      rewardType: r.rewardType,
      label: r.label,
      icon: r.icon,
      amountCoins: r.amountCoins,
      claimed,
      claimable: reachedLevel && trackAllowed && !claimed,
      locked: !trackAllowed,
    };
  });

  return {
    season: {
      id: season.id,
      name: season.name,
      seasonNumber: season.seasonNumber,
      maxLevel: season.maxLevel,
      xpPerLevel: season.xpPerLevel,
      premiumCostCoins: season.premiumCostCoins,
      endsAt: season.endsAt?.toISOString() ?? null,
    },
    level,
    xp,
    xpIntoLevel: xp % season.xpPerLevel,
    xpPerLevel: season.xpPerLevel,
    premium,
    rewards,
  };
}

export class BattlePassError extends Error {}

type RewardContents = {
  rewardType: BattlePassRewardType;
  amountCoins: number;
  catalogSkinId: string | null;
  agentDefIndex: number | null;
  stickerDefIndex: number | null;
  label: string;
};

/** Credit coins to a user inside a transaction. */
async function grantCoinReward(
  client: DbClient,
  userId: string,
  reward: RewardContents,
): Promise<void> {
  await creditCoins(client, {
    userId,
    amount: reward.amountCoins,
    kind: "EARN_BATTLEPASS",
    reason: `Passe de Batalha: ${reward.label}`,
  });
}

/** Grant a skin/agent/sticker reward via the shared store pipeline (no tx). */
async function grantItemReward(userId: string, reward: RewardContents): Promise<void> {
  const rewardRow = {
    kind:
      reward.rewardType === "SKIN"
        ? "CATALOG_SKIN"
        : reward.rewardType === "AGENT"
          ? "AGENT"
          : "STICKER",
    catalogSkinId: reward.catalogSkinId,
    agentDefIndex: reward.agentDefIndex,
    stickerDefIndex: reward.stickerDefIndex,
  } as unknown as StoreItemReward;
  await grantStoreRewardRow(userId, rewardRow, { notifySkin: false });
}

export async function claimBattlePassReward(userId: string, rewardId: string): Promise<void> {
  const reward = await prisma.battlePassReward.findUnique({
    where: { id: rewardId },
    include: { season: true },
  });
  if (!reward) throw new BattlePassError("Recompensa não encontrada.");

  const pass = await prisma.userBattlePass.findUnique({
    where: { userId_seasonId: { userId, seasonId: reward.seasonId } },
  });
  const level = pass?.level ?? 1;
  const premium = pass?.premium ?? false;

  if (level < reward.level) throw new BattlePassError("Nível do passe insuficiente.");
  if (reward.track === "PREMIUM" && !premium) throw new BattlePassError("Requer passe premium.");

  const already = await prisma.userBattlePassClaim.findUnique({
    where: { userId_rewardId: { userId, rewardId } },
  });
  if (already) throw new BattlePassError("Recompensa já resgatada.");

  if (reward.rewardType === "COINS") {
    await prisma.$transaction(async (tx) => {
      await tx.userBattlePassClaim.create({ data: { userId, rewardId } });
      await grantCoinReward(tx, userId, reward);
    });
    return;
  }

  // Non-coin rewards: record claim first, then grant via store pipeline.
  await prisma.userBattlePassClaim.create({ data: { userId, rewardId } });
  try {
    await grantItemReward(userId, reward);
  } catch (err) {
    await prisma.userBattlePassClaim.deleteMany({ where: { userId, rewardId } });
    throw err;
  }
}

export async function purchaseBattlePassPremium(userId: string): Promise<void> {
  await ensureBattlePassSeeded();
  const season = await prisma.battlePassSeason.findFirst({ where: { active: true } });
  if (!season) throw new BattlePassError("Nenhuma temporada ativa.");

  const existing = await prisma.userBattlePass.findUnique({
    where: { userId_seasonId: { userId, seasonId: season.id } },
  });
  if (existing?.premium) throw new BattlePassError("Você já possui o passe premium.");

  await prisma.$transaction(async (tx) => {
    try {
      await debitCoins(tx, {
        userId,
        amount: season.premiumCostCoins,
        kind: "PURCHASE",
        reason: `Passe de Batalha Premium — ${season.name}`,
        metadata: { seasonId: season.id },
      });
    } catch (err) {
      if (err instanceof InsufficientCoinsError) {
        throw new BattlePassError("Moedas insuficientes para o passe premium.");
      }
      throw err;
    }

    await tx.userBattlePass.upsert({
      where: { userId_seasonId: { userId, seasonId: season.id } },
      create: { userId, seasonId: season.id, premium: true },
      update: { premium: true },
    });
  });
}
