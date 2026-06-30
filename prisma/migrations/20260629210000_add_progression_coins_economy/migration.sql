-- Progression + coin economy (additive only; safe for shared DB)

-- CreateEnum (guarded for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoinTransactionKind') THEN
    CREATE TYPE "CoinTransactionKind" AS ENUM (
      'EARN_MATCH',
      'EARN_MISSION',
      'EARN_ACHIEVEMENT',
      'EARN_BATTLEPASS',
      'PURCHASE',
      'GIFT_SENT',
      'GIFT_RECEIVED',
      'ADMIN_ADJUST',
      'REFUND'
    );
  END IF;
END$$;

-- AlterTable User: progression + wallet
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lifetimeCoins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable StoreItem: optional coin price
ALTER TABLE "StoreItem" ADD COLUMN IF NOT EXISTS "coinPrice" INTEGER;

-- CreateTable CoinTransaction
CREATE TABLE IF NOT EXISTS "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "kind" "CoinTransactionKind" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoinTransaction_kind_idx" ON "CoinTransaction"("kind");
CREATE INDEX IF NOT EXISTS "User_level_idx" ON "User"("level");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoinTransaction_userId_fkey'
  ) THEN
    ALTER TABLE "CoinTransaction"
      ADD CONSTRAINT "CoinTransaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
