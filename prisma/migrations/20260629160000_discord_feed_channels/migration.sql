CREATE TABLE IF NOT EXISTS "DiscordFeedPublishLog" (
    "id" TEXT NOT NULL,
    "feedType" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscordFeedPublishLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscordFeedPublishLog_feedType_itemKey_key"
  ON "DiscordFeedPublishLog"("feedType", "itemKey");
CREATE INDEX IF NOT EXISTS "DiscordFeedPublishLog_feedType_idx"
  ON "DiscordFeedPublishLog"("feedType");

CREATE TABLE IF NOT EXISTS "DiscordBotFeedChannel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "feedType" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscordBotFeedChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscordBotFeedChannel_guildId_feedType_key"
  ON "DiscordBotFeedChannel"("guildId", "feedType");
CREATE INDEX IF NOT EXISTS "DiscordBotFeedChannel_guildId_idx"
  ON "DiscordBotFeedChannel"("guildId");
