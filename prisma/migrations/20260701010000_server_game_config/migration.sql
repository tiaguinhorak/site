-- Per-pool gameplay config (warmup time, warmup economy, buy anywhere, random spawns, DM respawn).
CREATE TABLE IF NOT EXISTS "ServerGameConfig" (
  "id" TEXT NOT NULL,
  "pool" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "warmupSeconds" INTEGER NOT NULL DEFAULT 60,
  "warmupStartMoney" INTEGER NOT NULL DEFAULT 16000,
  "warmupMaxMoney" INTEGER NOT NULL DEFAULT 16000,
  "warmupBuyAnywhere" BOOLEAN NOT NULL DEFAULT true,
  "randomSpawns" BOOLEAN NOT NULL DEFAULT true,
  "dmRespawn" BOOLEAN NOT NULL DEFAULT false,
  "gameType" INTEGER NOT NULL DEFAULT 0,
  "gameMode" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerGameConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServerGameConfig_pool_key" ON "ServerGameConfig"("pool");
CREATE INDEX IF NOT EXISTS "ServerGameConfig_enabled_idx" ON "ServerGameConfig"("enabled");

-- Seed defaults for the common pools so admin sees rows immediately.
INSERT INTO "ServerGameConfig" ("id", "pool", "warmupSeconds", "warmupStartMoney", "warmupMaxMoney", "warmupBuyAnywhere", "randomSpawns", "dmRespawn", "gameType", "gameMode", "updatedAt")
VALUES
  ('sgc_ranked', 'ranked', 60, 16000, 16000, true, true, false, 0, 1, CURRENT_TIMESTAMP),
  ('sgc_warmup', 'warmup', 60, 16000, 16000, true, true, true, 0, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("pool") DO NOTHING;
