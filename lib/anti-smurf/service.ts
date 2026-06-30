import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SmurfSignalType, SmurfStatus, User } from "@/lib/generated/prisma/client";
import { RankedPartyError } from "@/lib/errors/domain";

const NEW_STEAM_ACCOUNT_DAYS = 30;
const SMURF_HOLD_DAYS_NEW_STEAM = 14;
const SMURF_HOLD_DAYS_NEW_SITE = 7;
const RISK_REVIEW_THRESHOLD = 4;
const RISK_FLAG_THRESHOLD = 8;

type SmurfEvaluation = {
  riskScore: number;
  status: SmurfStatus;
  rankedHoldUntil: Date | null;
  signals: Array<{ type: SmurfSignalType; score: number; metadata: Record<string, unknown> }>;
};

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

async function addSignal(
  userId: string,
  signalType: SmurfSignalType,
  score: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  const recent = await prisma.smurfSignal.findFirst({
    where: {
      userId,
      signalType,
      resolved: false,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return;

  await prisma.smurfSignal.create({
    data: {
      userId,
      signalType,
      score,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

export async function evaluateSmurfRisk(user: Pick<
  User,
  | "id"
  | "createdAt"
  | "steamId"
  | "steamLinkedAt"
  | "steamAccountCreatedAt"
  | "elo"
  | "matches"
  | "rankedWins"
  | "rankedLosses"
>): Promise<SmurfEvaluation> {
  const signals: SmurfEvaluation["signals"] = [];
  let riskScore = 0;
  let rankedHoldUntil: Date | null = null;

  const accountAgeDays = daysSince(user.createdAt);
  if (accountAgeDays < SMURF_HOLD_DAYS_NEW_SITE) {
    rankedHoldUntil = new Date(
      user.createdAt.getTime() + SMURF_HOLD_DAYS_NEW_SITE * 24 * 60 * 60 * 1000,
    );
  }

  if (user.steamAccountCreatedAt) {
    const steamAgeDays = daysSince(user.steamAccountCreatedAt);
    if (steamAgeDays < NEW_STEAM_ACCOUNT_DAYS) {
      signals.push({
        type: "NEW_STEAM_ACCOUNT",
        score: 3,
        metadata: { steamAgeDays },
      });
      riskScore += 3;
      const holdUntil = new Date(
        user.steamAccountCreatedAt.getTime() + SMURF_HOLD_DAYS_NEW_STEAM * 24 * 60 * 60 * 1000,
      );
      if (!rankedHoldUntil || holdUntil > rankedHoldUntil) {
        rankedHoldUntil = holdUntil;
      }
    } else if (steamAgeDays < 90) {
      signals.push({
        type: "LOW_STEAM_AGE",
        score: 1,
        metadata: { steamAgeDays },
      });
      riskScore += 1;
    }
  }

  const rankedMatches = user.rankedWins + user.rankedLosses;
  if (accountAgeDays < 14 && user.elo >= 1600 && rankedMatches < 20) {
    signals.push({
      type: "RAPID_RANK_CLIMB",
      score: 4,
      metadata: { accountAgeDays, elo: user.elo, rankedMatches },
    });
    riskScore += 4;
  }

  if (accountAgeDays < 7 && rankedMatches >= 5 && user.elo >= 1400) {
    signals.push({
      type: "STAT_ANOMALY",
      score: 2,
      metadata: { accountAgeDays, elo: user.elo, rankedMatches },
    });
    riskScore += 2;
  }

  const fingerprints = await prisma.accountFingerprint.findMany({
    where: { userId: user.id },
    select: { ipHash: true },
    take: 20,
  });
  const ipHashes = [...new Set(fingerprints.map((row) => row.ipHash))];

  if (ipHashes.length > 0) {
    const linked = await prisma.accountFingerprint.findMany({
      where: {
        ipHash: { in: ipHashes },
        userId: { not: user.id },
      },
      select: { userId: true, ipHash: true },
      take: 50,
    });

    const otherUserIds = [...new Set(linked.map((row) => row.userId))];
    if (otherUserIds.length > 0) {
      const others = await prisma.user.findMany({
        where: { id: { in: otherUserIds } },
        select: { id: true, steamId: true, nickname: true, smurfStatus: true },
      });

      const distinctSteam = new Set(
        others.map((row) => row.steamId).filter(Boolean),
      );
      if (distinctSteam.size > 0 && user.steamId) {
        signals.push({
          type: "SHARED_IP",
          score: 3,
          metadata: {
            linkedAccounts: others.length,
            distinctSteamAccounts: distinctSteam.size,
          },
        });
        riskScore += 3;
      }

      const flaggedLinked = others.filter(
        (row) => row.smurfStatus === "FLAGGED" || row.smurfStatus === "CONFIRMED",
      );
      if (flaggedLinked.length > 0) {
        signals.push({
          type: "SHARED_IP",
          score: 5,
          metadata: { flaggedLinked: flaggedLinked.map((row) => row.nickname) },
        });
        riskScore += 5;
      }
    }
  }

  let status: SmurfStatus = "CLEAR";
  if (riskScore >= RISK_FLAG_THRESHOLD) status = "FLAGGED";
  else if (riskScore >= RISK_REVIEW_THRESHOLD) status = "REVIEW";

  return { riskScore, status, rankedHoldUntil, signals };
}

export async function refreshSmurfProfile(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      steamId: true,
      steamLinkedAt: true,
      steamAccountCreatedAt: true,
      elo: true,
      matches: true,
      rankedWins: true,
      rankedLosses: true,
      smurfStatus: true,
    },
  });
  if (!user) return;

  const evaluation = await evaluateSmurfRisk(user);

  for (const signal of evaluation.signals) {
    await addSignal(userId, signal.type, signal.score, signal.metadata);
  }

  const nextStatus =
    user.smurfStatus === "CONFIRMED" ? "CONFIRMED" : evaluation.status;

  await prisma.user.update({
    where: { id: userId },
    data: {
      smurfRiskScore: evaluation.riskScore,
      smurfStatus: nextStatus,
      rankedSmurfHoldUntil: evaluation.rankedHoldUntil,
    },
  });
}

export async function assertRankedSmurfEligible(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      smurfStatus: true,
      rankedSmurfHoldUntil: true,
    },
  });
  if (!user) return;

  if (user.smurfStatus === "CONFIRMED") {
    throw new RankedPartyError("smurfConfirmed", 403);
  }

  if (user.rankedSmurfHoldUntil && user.rankedSmurfHoldUntil > new Date()) {
    throw new RankedPartyError("smurfHold", 403, {
      date: user.rankedSmurfHoldUntil.toLocaleDateString("pt-BR"),
    });
  }

  if (user.smurfStatus === "FLAGGED") {
    throw new RankedPartyError("smurfReview", 403);
  }
}

export async function assertNotSmurfBlocked(userId: string): Promise<void> {
  await assertRankedSmurfEligible(userId);
}

export async function onSteamLinked(userId: string, steamCreatedAt: Date | null): Promise<void> {
  if (steamCreatedAt) {
    await prisma.user.update({
      where: { id: userId },
      data: { steamAccountCreatedAt: steamCreatedAt },
    });
  }

  await addSignal(userId, "STEAM_RELINK", 1, {
    steamCreatedAt: steamCreatedAt?.toISOString() ?? null,
  });

  await refreshSmurfProfile(userId);
}
