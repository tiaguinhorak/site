import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import type { CoinTransactionKind } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Accepts either the root client or a transaction client. */
export type DbClient = typeof prisma | Prisma.TransactionClient;

export class InsufficientCoinsError extends Error {
  constructor(
    public readonly balance: number,
    public readonly required: number,
  ) {
    super("Saldo de moedas insuficiente.");
    this.name = "InsufficientCoinsError";
  }
}

type CoinChangeInput = {
  userId: string;
  amount: number;
  kind: CoinTransactionKind;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CoinChangeResult = {
  balance: number;
  amount: number;
};

/**
 * Credit coins to a user and record a ledger entry. `amount` must be positive.
 * Lifetime coins only ever increase.
 */
export async function creditCoins(
  client: DbClient,
  input: CoinChangeInput,
): Promise<CoinChangeResult> {
  const amount = Math.floor(input.amount);
  if (amount <= 0) {
    const current = await client.user.findUnique({
      where: { id: input.userId },
      select: { coins: true },
    });
    return { balance: current?.coins ?? 0, amount: 0 };
  }

  const updated = await client.user.update({
    where: { id: input.userId },
    data: {
      coins: { increment: amount },
      lifetimeCoins: { increment: amount },
    },
    select: { coins: true },
  });

  await client.coinTransaction.create({
    data: {
      userId: input.userId,
      amount,
      balanceAfter: updated.coins,
      kind: input.kind,
      reason: input.reason ?? "",
      metadata: input.metadata,
    },
  });

  return { balance: updated.coins, amount };
}

/**
 * Debit coins from a user atomically. Throws `InsufficientCoinsError` when the
 * balance is too low. `amount` must be positive.
 */
export async function debitCoins(
  client: DbClient,
  input: CoinChangeInput,
): Promise<CoinChangeResult> {
  const amount = Math.floor(input.amount);
  if (amount <= 0) {
    const current = await client.user.findUnique({
      where: { id: input.userId },
      select: { coins: true },
    });
    return { balance: current?.coins ?? 0, amount: 0 };
  }

  // Conditional decrement prevents going negative under concurrency.
  const result = await client.user.updateMany({
    where: { id: input.userId, coins: { gte: amount } },
    data: { coins: { decrement: amount } },
  });

  if (result.count === 0) {
    const current = await client.user.findUnique({
      where: { id: input.userId },
      select: { coins: true },
    });
    throw new InsufficientCoinsError(current?.coins ?? 0, amount);
  }

  const updated = await client.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { coins: true },
  });

  await client.coinTransaction.create({
    data: {
      userId: input.userId,
      amount: -amount,
      balanceAfter: updated.coins,
      kind: input.kind,
      reason: input.reason ?? "",
      metadata: input.metadata,
    },
  });

  return { balance: updated.coins, amount: -amount };
}

export type WalletSummary = {
  coins: number;
  lifetimeCoins: number;
  transactions: {
    id: string;
    amount: number;
    balanceAfter: number;
    kind: CoinTransactionKind;
    reason: string;
    createdAt: string;
  }[];
};

export async function getWalletSummary(
  userId: string,
  limit = 20,
): Promise<WalletSummary> {
  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, lifetimeCoins: true },
    }),
    prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(limit, 100)),
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        kind: true,
        reason: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    coins: user?.coins ?? 0,
    lifetimeCoins: user?.lifetimeCoins ?? 0,
    transactions: transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      kind: tx.kind,
      reason: tx.reason,
      createdAt: tx.createdAt.toISOString(),
    })),
  };
}
