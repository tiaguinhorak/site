-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM', 'ELITE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'MATCH', 'SOCIAL', 'PROMO');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('KNIFE', 'GLOVES', 'RIFLE', 'PISTOL', 'SMG', 'AGENT');

-- CreateEnum
CREATE TYPE "InventoryRarity" AS ENUM ('COMUM', 'RARO', 'EPICO', 'LENDARIO', 'MITICO');

-- CreateEnum
CREATE TYPE "PunishmentType" AS ENUM ('BAN', 'MUTE', 'WARNING', 'KICK', 'RESTRICT');

-- CreateEnum
CREATE TYPE "PunishmentScope" AS ENUM ('PLATFORM', 'SERVER');

-- CreateEnum
CREATE TYPE "CsgoSkinWear" AS ENUM ('factory_new', 'minimal_wear', 'field_tested', 'well_worn', 'battle_scarred');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "nickname" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'BR',
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT,
    "avatarPreset" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "kd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "winRate" INTEGER NOT NULL DEFAULT 0,
    "hoursPlayed" INTEGER NOT NULL DEFAULT 0,
    "anticheatInstalled" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "steamId" TEXT,
    "steamLinkedAt" TIMESTAMP(3),
    "steamPersonaName" TEXT,
    "steamAvatarUrl" TEXT,
    "steamProfileUrl" TEXT,
    "steamCountryCode" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "rankedQueueDodges" INTEGER NOT NULL DEFAULT 0,
    "rankedRestrictedUntil" TIMESTAMP(3),
    "rankedLastDodgeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punishment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "type" "PunishmentType" NOT NULL,
    "scope" "PunishmentScope" NOT NULL DEFAULT 'PLATFORM',
    "serverName" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "Punishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "titleKey" TEXT,
    "bodyKey" TEXT,
    "params" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreferences" (
    "userId" TEXT NOT NULL,
    "emailNewsletter" BOOLEAN NOT NULL DEFAULT true,
    "inAppMatch" BOOLEAN NOT NULL DEFAULT true,
    "inAppSocial" BOOLEAN NOT NULL DEFAULT true,
    "inAppPromo" BOOLEAN NOT NULL DEFAULT true,
    "inAppSystem" BOOLEAN NOT NULL DEFAULT true,
    "browserPush" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserNotificationPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "GameMode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "iconKey" TEXT NOT NULL DEFAULT 'Crosshair',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameModeRoom" (
    "id" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "players" INTEGER NOT NULL DEFAULT 0,
    "slots" INTEGER NOT NULL,
    "ping" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameModeRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyRoom" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "catalogRoomId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "slots" INTEGER NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'BR',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "passwordHash" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'open',
    "ping" INTEGER NOT NULL DEFAULT 25,
    "matchId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LobbyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedParty" (
    "id" TEXT NOT NULL,
    "leaderUserId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "name" TEXT,
    "region" TEXT NOT NULL DEFAULT 'BR',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "passwordHash" TEXT,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 20,
    "mapPool" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedPartyActivity" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "actorNickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedPartyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedPartyMessage" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedPartyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedPartyMember" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedPartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedChallenge" (
    "id" TEXT NOT NULL,
    "fromPartyId" TEXT NOT NULL,
    "toPartyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "RankedChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedMatchSession" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT,
    "lobbyRoomId" TEXT,
    "matchSource" TEXT NOT NULL DEFAULT 'challenge',
    "teamSize" INTEGER NOT NULL DEFAULT 5,
    "partyAId" TEXT NOT NULL,
    "partyBId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepting',
    "csgoMatchId" TEXT,
    "selectedMap" TEXT,
    "serverHost" TEXT,
    "serverPort" INTEGER,
    "vetoData" JSONB,
    "voteEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedMatchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedMatchAcceptance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "RankedMatchAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedMapVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedMapVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyMember" (
    "id" TEXT NOT NULL,
    "lobbyRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyJoinQueue" (
    "id" TEXT NOT NULL,
    "lobbyRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planPriority" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbyJoinQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedQueueEntry" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "leaderUserId" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "avgElo" INTEGER NOT NULL,
    "planPriority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'searching',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "imageAccent" TEXT NOT NULL,
    "imageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "translations" JSONB,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "originalCents" INTEGER,
    "badge" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "trending" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "rarity" "InventoryRarity" NOT NULL,
    "accent" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "owned" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "map" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "players" INTEGER NOT NULL DEFAULT 0,
    "slots" INTEGER NOT NULL,
    "ping" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "csgoServerId" TEXT,
    "host" TEXT,
    "port" INTEGER,
    "isLiveSynced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PublicServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kd" DOUBLE PRECISION NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingFeature" (
    "id" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MarketingFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "features" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteStat" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsgoServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "sshPort" INTEGER NOT NULL DEFAULT 22,
    "sshUser" TEXT,
    "sshPassword" TEXT,
    "rconPort" INTEGER NOT NULL,
    "rconPassword" TEXT NOT NULL,
    "csgoDir" TEXT NOT NULL,
    "screenSession" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "port" INTEGER NOT NULL,
    "tickrate" INTEGER NOT NULL DEFAULT 128,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsgoServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsgoMatch" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "teamA" JSONB NOT NULL,
    "teamB" JSONB NOT NULL,
    "mapPool" JSONB NOT NULL,
    "vetoHistory" JSONB NOT NULL DEFAULT '[]',
    "pickedMaps" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'waiting_players',
    "serverId" TEXT,
    "selectedMap" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsgoMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsgoSkinCatalog" (
    "id" TEXT NOT NULL,
    "weaponId" TEXT NOT NULL,
    "weaponName" TEXT NOT NULL,
    "paintkit" INTEGER NOT NULL,
    "paintkitName" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "CsgoSkinCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsgoPlayerSkin" (
    "id" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "wear" "CsgoSkinWear" NOT NULL DEFAULT 'field_tested',
    "seed" INTEGER NOT NULL DEFAULT 0,
    "stattrak" BOOLEAN NOT NULL DEFAULT false,
    "stattrakCount" INTEGER NOT NULL DEFAULT 0,
    "nametag" TEXT,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CsgoPlayerSkin_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Punishment_userId_active_idx" ON "Punishment"("userId", "active");

-- CreateIndex
CREATE INDEX "Punishment_type_active_idx" ON "Punishment"("type", "active");

-- CreateIndex
CREATE INDEX "Punishment_createdAt_idx" ON "Punishment"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "GameMode_slug_key" ON "GameMode"("slug");

-- CreateIndex
CREATE INDEX "GameModeRoom_gameModeId_idx" ON "GameModeRoom"("gameModeId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyRoom_catalogRoomId_key" ON "LobbyRoom"("catalogRoomId");

-- CreateIndex
CREATE INDEX "LobbyRoom_status_idx" ON "LobbyRoom"("status");

-- CreateIndex
CREATE INDEX "LobbyRoom_gameModeId_idx" ON "LobbyRoom"("gameModeId");

-- CreateIndex
CREATE INDEX "LobbyRoom_hostUserId_idx" ON "LobbyRoom"("hostUserId");

-- CreateIndex
CREATE INDEX "LobbyRoom_createdAt_idx" ON "LobbyRoom"("createdAt");

-- CreateIndex
CREATE INDEX "LobbyRoom_isSystem_idx" ON "LobbyRoom"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "RankedParty_inviteCode_key" ON "RankedParty"("inviteCode");

-- CreateIndex
CREATE INDEX "RankedParty_leaderUserId_idx" ON "RankedParty"("leaderUserId");

-- CreateIndex
CREATE INDEX "RankedParty_status_idx" ON "RankedParty"("status");

-- CreateIndex
CREATE INDEX "RankedPartyActivity_partyId_createdAt_idx" ON "RankedPartyActivity"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "RankedPartyMessage_partyId_createdAt_idx" ON "RankedPartyMessage"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "RankedPartyMember_partyId_idx" ON "RankedPartyMember"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedPartyMember_partyId_userId_key" ON "RankedPartyMember"("partyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedPartyMember_partyId_slotIndex_key" ON "RankedPartyMember"("partyId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RankedPartyMember_userId_key" ON "RankedPartyMember"("userId");

-- CreateIndex
CREATE INDEX "RankedChallenge_fromPartyId_idx" ON "RankedChallenge"("fromPartyId");

-- CreateIndex
CREATE INDEX "RankedChallenge_toPartyId_idx" ON "RankedChallenge"("toPartyId");

-- CreateIndex
CREATE INDEX "RankedChallenge_status_idx" ON "RankedChallenge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RankedMatchSession_challengeId_key" ON "RankedMatchSession"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedMatchSession_lobbyRoomId_key" ON "RankedMatchSession"("lobbyRoomId");

-- CreateIndex
CREATE INDEX "RankedMatchSession_partyAId_idx" ON "RankedMatchSession"("partyAId");

-- CreateIndex
CREATE INDEX "RankedMatchSession_partyBId_idx" ON "RankedMatchSession"("partyBId");

-- CreateIndex
CREATE INDEX "RankedMatchSession_status_idx" ON "RankedMatchSession"("status");

-- CreateIndex
CREATE INDEX "RankedMatchSession_lobbyRoomId_idx" ON "RankedMatchSession"("lobbyRoomId");

-- CreateIndex
CREATE INDEX "RankedMatchAcceptance_sessionId_idx" ON "RankedMatchAcceptance"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedMatchAcceptance_sessionId_userId_key" ON "RankedMatchAcceptance"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "RankedMapVote_sessionId_idx" ON "RankedMapVote"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedMapVote_sessionId_userId_key" ON "RankedMapVote"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "LobbyMember_lobbyRoomId_idx" ON "LobbyMember"("lobbyRoomId");

-- CreateIndex
CREATE INDEX "LobbyMember_userId_idx" ON "LobbyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_lobbyRoomId_userId_key" ON "LobbyMember"("lobbyRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_lobbyRoomId_slotIndex_key" ON "LobbyMember"("lobbyRoomId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_userId_key" ON "LobbyMember"("userId");

-- CreateIndex
CREATE INDEX "LobbyJoinQueue_lobbyRoomId_planPriority_requestedAt_idx" ON "LobbyJoinQueue"("lobbyRoomId", "planPriority", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyJoinQueue_lobbyRoomId_userId_key" ON "LobbyJoinQueue"("lobbyRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RankedQueueEntry_partyId_key" ON "RankedQueueEntry"("partyId");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_status_joinedAt_idx" ON "RankedQueueEntry"("status", "joinedAt");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_leaderUserId_idx" ON "RankedQueueEntry"("leaderUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_slug_key" ON "NewsArticle"("slug");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_authorId_idx" ON "NewsArticle"("authorId");

-- CreateIndex
CREATE INDEX "UserInventoryItem_userId_idx" ON "UserInventoryItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventoryItem_userId_inventoryItemId_key" ON "UserInventoryItem"("userId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicServer_csgoServerId_key" ON "PublicServer"("csgoServerId");

-- CreateIndex
CREATE INDEX "PublicServer_isLiveSynced_idx" ON "PublicServer"("isLiveSynced");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_rank_key" ON "LeaderboardEntry"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");

-- CreateIndex
CREATE INDEX "CsgoServer_status_idx" ON "CsgoServer"("status");

-- CreateIndex
CREATE INDEX "CsgoMatch_status_idx" ON "CsgoMatch"("status");

-- CreateIndex
CREATE INDEX "CsgoMatch_roomId_idx" ON "CsgoMatch"("roomId");

-- CreateIndex
CREATE INDEX "CsgoMatch_serverId_idx" ON "CsgoMatch"("serverId");

-- CreateIndex
CREATE INDEX "CsgoSkinCatalog_weaponId_idx" ON "CsgoSkinCatalog"("weaponId");

-- CreateIndex
CREATE INDEX "CsgoPlayerSkin_steamId_idx" ON "CsgoPlayerSkin"("steamId");

-- CreateIndex
CREATE INDEX "CsgoPlayerSkin_steamId_equipped_idx" ON "CsgoPlayerSkin"("steamId", "equipped");

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreferences" ADD CONSTRAINT "UserNotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameModeRoom" ADD CONSTRAINT "GameModeRoom_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "GameMode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyRoom" ADD CONSTRAINT "LobbyRoom_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyRoom" ADD CONSTRAINT "LobbyRoom_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "GameMode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyRoom" ADD CONSTRAINT "LobbyRoom_catalogRoomId_fkey" FOREIGN KEY ("catalogRoomId") REFERENCES "GameModeRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedParty" ADD CONSTRAINT "RankedParty_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedPartyActivity" ADD CONSTRAINT "RankedPartyActivity_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedPartyMessage" ADD CONSTRAINT "RankedPartyMessage_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedPartyMessage" ADD CONSTRAINT "RankedPartyMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedChallenge" ADD CONSTRAINT "RankedChallenge_fromPartyId_fkey" FOREIGN KEY ("fromPartyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedChallenge" ADD CONSTRAINT "RankedChallenge_toPartyId_fkey" FOREIGN KEY ("toPartyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "RankedChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_lobbyRoomId_fkey" FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_partyAId_fkey" FOREIGN KEY ("partyAId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_partyBId_fkey" FOREIGN KEY ("partyBId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMatchAcceptance" ADD CONSTRAINT "RankedMatchAcceptance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMatchAcceptance" ADD CONSTRAINT "RankedMatchAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMapVote" ADD CONSTRAINT "RankedMapVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedMapVote" ADD CONSTRAINT "RankedMapVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_lobbyRoomId_fkey" FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyJoinQueue" ADD CONSTRAINT "LobbyJoinQueue_lobbyRoomId_fkey" FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyJoinQueue" ADD CONSTRAINT "LobbyJoinQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventoryItem" ADD CONSTRAINT "UserInventoryItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsgoMatch" ADD CONSTRAINT "CsgoMatch_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "CsgoServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsgoPlayerSkin" ADD CONSTRAINT "CsgoPlayerSkin_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "CsgoSkinCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

