-- Discord account linking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordUserId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordUsername" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_discordUserId_key" ON "User"("discordUserId");

CREATE TABLE IF NOT EXISTS "DiscordLinkCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscordLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscordLinkCode_code_key" ON "DiscordLinkCode"("code");
CREATE INDEX IF NOT EXISTS "DiscordLinkCode_discordUserId_idx" ON "DiscordLinkCode"("discordUserId");
CREATE INDEX IF NOT EXISTS "DiscordLinkCode_expiresAt_idx" ON "DiscordLinkCode"("expiresAt");
