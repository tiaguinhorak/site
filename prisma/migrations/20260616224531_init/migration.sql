-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT,
    "nickname" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'BR',
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "kd" REAL NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "winRate" INTEGER NOT NULL DEFAULT 0,
    "hoursPlayed" INTEGER NOT NULL DEFAULT 0,
    "anticheatInstalled" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "steamId" TEXT,
    "steamPersonaName" TEXT,
    "steamAvatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameMode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "iconKey" TEXT NOT NULL DEFAULT 'Crosshair',
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "GameModeRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameModeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "players" INTEGER NOT NULL DEFAULT 0,
    "slots" INTEGER NOT NULL,
    "ping" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GameModeRoom_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "GameMode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageAccent" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "originalCents" INTEGER,
    "badge" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "trending" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UserInventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "owned" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserInventoryItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublicServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "players" INTEGER NOT NULL DEFAULT 0,
    "slots" INTEGER NOT NULL,
    "ping" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kd" REAL NOT NULL,
    "points" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingFeature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "index" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "features" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SiteStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");

-- CreateIndex
CREATE INDEX "User_rank_idx" ON "User"("rank");

-- CreateIndex
CREATE INDEX "User_elo_idx" ON "User"("elo");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "GameMode_slug_key" ON "GameMode"("slug");

-- CreateIndex
CREATE INDEX "GameModeRoom_gameModeId_idx" ON "GameModeRoom"("gameModeId");

-- CreateIndex
CREATE INDEX "UserInventoryItem_userId_idx" ON "UserInventoryItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventoryItem_userId_inventoryItemId_key" ON "UserInventoryItem"("userId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_rank_key" ON "LeaderboardEntry"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");
