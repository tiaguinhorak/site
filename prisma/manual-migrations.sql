ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedQueueDodges" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedRestrictedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rankedLastDodgeAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CsgoSkinWear') THEN
    CREATE TYPE "CsgoSkinWear" AS ENUM (
      'factory_new',
      'minimal_wear',
      'field_tested',
      'well_worn',
      'battle_scarred'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CsgoServer" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"            TEXT NOT NULL,
  "host"            TEXT NOT NULL,
  "sshPort"         INTEGER NOT NULL DEFAULT 22,
  "sshUser"         TEXT,
  "sshPassword"     TEXT,
  "rconPort"        INTEGER NOT NULL,
  "rconPassword"    TEXT NOT NULL,
  "csgoDir"         TEXT NOT NULL,
  "screenSession"   TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'offline',
  "port"            INTEGER NOT NULL,
  "tickrate"        INTEGER NOT NULL DEFAULT 128,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsgoServer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CsgoServer_status_idx" ON "CsgoServer"("status");

CREATE TABLE IF NOT EXISTS "CsgoMatch" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "roomId"       TEXT NOT NULL,
  "teamA"        JSONB NOT NULL,
  "teamB"        JSONB NOT NULL,
  "mapPool"      JSONB NOT NULL,
  "vetoHistory"  JSONB NOT NULL DEFAULT '[]',
  "pickedMaps"   JSONB NOT NULL DEFAULT '{}',
  "status"       TEXT NOT NULL DEFAULT 'waiting_players',
  "serverId"     UUID,
  "selectedMap"  TEXT,
  "config"       JSONB NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsgoMatch_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CsgoMatch_serverId_fkey'
  ) THEN
    ALTER TABLE "CsgoMatch"
      ADD CONSTRAINT "CsgoMatch_serverId_fkey"
      FOREIGN KEY ("serverId") REFERENCES "CsgoServer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CsgoMatch_status_idx" ON "CsgoMatch"("status");
CREATE INDEX IF NOT EXISTS "CsgoMatch_roomId_idx" ON "CsgoMatch"("roomId");
CREATE INDEX IF NOT EXISTS "CsgoMatch_serverId_idx" ON "CsgoMatch"("serverId");

CREATE TABLE IF NOT EXISTS "CsgoSkinCatalog" (
  "id"           TEXT NOT NULL,
  "weaponId"     TEXT NOT NULL,
  "weaponName"   TEXT NOT NULL,
  "paintkit"     INTEGER NOT NULL,
  "paintkitName" TEXT NOT NULL,
  "rarity"       TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  CONSTRAINT "CsgoSkinCatalog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CsgoSkinCatalog_weaponId_idx" ON "CsgoSkinCatalog"("weaponId");

CREATE TABLE IF NOT EXISTS "CsgoPlayerSkin" (
  "id"            TEXT NOT NULL,
  "steamId"       TEXT NOT NULL,
  "skinId"        TEXT NOT NULL,
  "wear"          "CsgoSkinWear" NOT NULL DEFAULT 'field_tested',
  "seed"          INTEGER NOT NULL DEFAULT 0,
  "stattrak"      BOOLEAN NOT NULL DEFAULT false,
  "stattrakCount" INTEGER NOT NULL DEFAULT 0,
  "nametag"       TEXT,
  "equipped"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsgoPlayerSkin_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CsgoPlayerSkin_skinId_fkey'
  ) THEN
    ALTER TABLE "CsgoPlayerSkin"
      ADD CONSTRAINT "CsgoPlayerSkin_skinId_fkey"
      FOREIGN KEY ("skinId") REFERENCES "CsgoSkinCatalog"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CsgoPlayerSkin_steamId_idx" ON "CsgoPlayerSkin"("steamId");
CREATE INDEX IF NOT EXISTS "CsgoPlayerSkin_steamId_equipped_idx" ON "CsgoPlayerSkin"("steamId", "equipped");

CREATE TABLE IF NOT EXISTS "LobbyRoom" (
  "id"           TEXT NOT NULL,
  "hostUserId"   TEXT NOT NULL,
  "gameModeId"   TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "map"          TEXT NOT NULL,
  "slots"        INTEGER NOT NULL,
  "region"       TEXT NOT NULL DEFAULT 'BR',
  "visibility"   TEXT NOT NULL DEFAULT 'public',
  "passwordHash" TEXT,
  "settings"     JSONB NOT NULL DEFAULT '{}',
  "status"       TEXT NOT NULL DEFAULT 'open',
  "ping"         INTEGER NOT NULL DEFAULT 25,
  "matchId"      TEXT,
  "expiresAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LobbyRoom_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyRoom_hostUserId_fkey') THEN
    ALTER TABLE "LobbyRoom"
      ADD CONSTRAINT "LobbyRoom_hostUserId_fkey"
      FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyRoom_gameModeId_fkey') THEN
    ALTER TABLE "LobbyRoom"
      ADD CONSTRAINT "LobbyRoom_gameModeId_fkey"
      FOREIGN KEY ("gameModeId") REFERENCES "GameMode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LobbyRoom_status_idx" ON "LobbyRoom"("status");
CREATE INDEX IF NOT EXISTS "LobbyRoom_gameModeId_idx" ON "LobbyRoom"("gameModeId");
CREATE INDEX IF NOT EXISTS "LobbyRoom_hostUserId_idx" ON "LobbyRoom"("hostUserId");
CREATE INDEX IF NOT EXISTS "LobbyRoom_createdAt_idx" ON "LobbyRoom"("createdAt");

CREATE TABLE IF NOT EXISTS "LobbyMember" (
  "id"          TEXT NOT NULL,
  "lobbyRoomId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "slotIndex"   INTEGER NOT NULL,
  "isReady"     BOOLEAN NOT NULL DEFAULT false,
  "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LobbyMember_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyMember_lobbyRoomId_fkey') THEN
    ALTER TABLE "LobbyMember"
      ADD CONSTRAINT "LobbyMember_lobbyRoomId_fkey"
      FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyMember_userId_fkey') THEN
    ALTER TABLE "LobbyMember"
      ADD CONSTRAINT "LobbyMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyMember_lobbyRoomId_userId_key') THEN
    ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_lobbyRoomId_userId_key" UNIQUE ("lobbyRoomId", "userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyMember_lobbyRoomId_slotIndex_key') THEN
    ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_lobbyRoomId_slotIndex_key" UNIQUE ("lobbyRoomId", "slotIndex");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LobbyMember_lobbyRoomId_idx" ON "LobbyMember"("lobbyRoomId");
CREATE INDEX IF NOT EXISTS "LobbyMember_userId_idx" ON "LobbyMember"("userId");

ALTER TABLE "LobbyRoom" ADD COLUMN IF NOT EXISTS "catalogRoomId" TEXT;
ALTER TABLE "LobbyRoom" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyRoom_catalogRoomId_key') THEN
    ALTER TABLE "LobbyRoom" ADD CONSTRAINT "LobbyRoom_catalogRoomId_key" UNIQUE ("catalogRoomId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyRoom_catalogRoomId_fkey') THEN
    ALTER TABLE "LobbyRoom"
      ADD CONSTRAINT "LobbyRoom_catalogRoomId_fkey"
      FOREIGN KEY ("catalogRoomId") REFERENCES "GameModeRoom"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LobbyRoom_isSystem_idx" ON "LobbyRoom"("isSystem");

CREATE TABLE IF NOT EXISTS "RankedParty" (
  "id"           TEXT NOT NULL,
  "leaderUserId" TEXT NOT NULL,
  "inviteCode"   TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'open',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RankedPartyMember" (
  "id"        TEXT NOT NULL,
  "partyId"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "slotIndex" INTEGER NOT NULL,
  "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedPartyMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RankedChallenge" (
  "id"          TEXT NOT NULL,
  "fromPartyId" TEXT NOT NULL,
  "toPartyId"   TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "RankedChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RankedMatchSession" (
  "id"          TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "partyAId"    TEXT NOT NULL,
  "partyBId"    TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'accepting',
  "csgoMatchId" TEXT,
  "selectedMap" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedMatchSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RankedMatchAcceptance" (
  "id"         TEXT NOT NULL,
  "sessionId"  TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "accepted"   BOOLEAN NOT NULL DEFAULT false,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "RankedMatchAcceptance_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedParty_leaderUserId_fkey') THEN
    ALTER TABLE "RankedParty" ADD CONSTRAINT "RankedParty_leaderUserId_fkey"
      FOREIGN KEY ("leaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedParty_inviteCode_key') THEN
    ALTER TABLE "RankedParty" ADD CONSTRAINT "RankedParty_inviteCode_key" UNIQUE ("inviteCode");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMember_partyId_fkey') THEN
    ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_partyId_fkey"
      FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMember_userId_fkey') THEN
    ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMember_partyId_userId_key') THEN
    ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_partyId_userId_key" UNIQUE ("partyId", "userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMember_partyId_slotIndex_key') THEN
    ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_partyId_slotIndex_key" UNIQUE ("partyId", "slotIndex");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMember_userId_key') THEN
    ALTER TABLE "RankedPartyMember" ADD CONSTRAINT "RankedPartyMember_userId_key" UNIQUE ("userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedChallenge_fromPartyId_fkey') THEN
    ALTER TABLE "RankedChallenge" ADD CONSTRAINT "RankedChallenge_fromPartyId_fkey"
      FOREIGN KEY ("fromPartyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedChallenge_toPartyId_fkey') THEN
    ALTER TABLE "RankedChallenge" ADD CONSTRAINT "RankedChallenge_toPartyId_fkey"
      FOREIGN KEY ("toPartyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_challengeId_key') THEN
    ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_challengeId_key" UNIQUE ("challengeId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_challengeId_fkey') THEN
    ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_challengeId_fkey"
      FOREIGN KEY ("challengeId") REFERENCES "RankedChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_partyAId_fkey') THEN
    ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_partyAId_fkey"
      FOREIGN KEY ("partyAId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_partyBId_fkey') THEN
    ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_partyBId_fkey"
      FOREIGN KEY ("partyBId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchAcceptance_sessionId_fkey') THEN
    ALTER TABLE "RankedMatchAcceptance" ADD CONSTRAINT "RankedMatchAcceptance_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchAcceptance_userId_fkey') THEN
    ALTER TABLE "RankedMatchAcceptance" ADD CONSTRAINT "RankedMatchAcceptance_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchAcceptance_sessionId_userId_key') THEN
    ALTER TABLE "RankedMatchAcceptance" ADD CONSTRAINT "RankedMatchAcceptance_sessionId_userId_key" UNIQUE ("sessionId", "userId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedParty_leaderUserId_idx" ON "RankedParty"("leaderUserId");
CREATE INDEX IF NOT EXISTS "RankedParty_status_idx" ON "RankedParty"("status");
CREATE INDEX IF NOT EXISTS "RankedPartyMember_partyId_idx" ON "RankedPartyMember"("partyId");
CREATE INDEX IF NOT EXISTS "RankedChallenge_fromPartyId_idx" ON "RankedChallenge"("fromPartyId");
CREATE INDEX IF NOT EXISTS "RankedChallenge_toPartyId_idx" ON "RankedChallenge"("toPartyId");
CREATE INDEX IF NOT EXISTS "RankedChallenge_status_idx" ON "RankedChallenge"("status");
CREATE INDEX IF NOT EXISTS "RankedMatchSession_partyAId_idx" ON "RankedMatchSession"("partyAId");
CREATE INDEX IF NOT EXISTS "RankedMatchSession_partyBId_idx" ON "RankedMatchSession"("partyBId");
CREATE INDEX IF NOT EXISTS "RankedMatchSession_status_idx" ON "RankedMatchSession"("status");
CREATE INDEX IF NOT EXISTS "RankedMatchAcceptance_sessionId_idx" ON "RankedMatchAcceptance"("sessionId");

ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "serverHost" TEXT;
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "serverPort" INTEGER;

ALTER TABLE "PublicServer" ADD COLUMN IF NOT EXISTS "csgoServerId" TEXT;
ALTER TABLE "PublicServer" ADD COLUMN IF NOT EXISTS "host" TEXT;
ALTER TABLE "PublicServer" ADD COLUMN IF NOT EXISTS "port" INTEGER;
ALTER TABLE "PublicServer" ADD COLUMN IF NOT EXISTS "isLiveSynced" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublicServer_csgoServerId_key') THEN
    ALTER TABLE "PublicServer" ADD CONSTRAINT "PublicServer_csgoServerId_key" UNIQUE ("csgoServerId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PublicServer_isLiveSynced_idx" ON "PublicServer"("isLiveSynced");

ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "vetoData" JSONB;
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "voteEndsAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "RankedMapVote" (
  "id"        TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "map"       TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedMapVote_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMapVote_sessionId_fkey') THEN
    ALTER TABLE "RankedMapVote" ADD CONSTRAINT "RankedMapVote_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "RankedMatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMapVote_userId_fkey') THEN
    ALTER TABLE "RankedMapVote" ADD CONSTRAINT "RankedMapVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMapVote_sessionId_userId_key') THEN
    ALTER TABLE "RankedMapVote" ADD CONSTRAINT "RankedMapVote_sessionId_userId_key" UNIQUE ("sessionId", "userId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedMapVote_sessionId_idx" ON "RankedMapVote"("sessionId");

ALTER TABLE "RankedMatchSession" ALTER COLUMN "challengeId" DROP NOT NULL;
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "matchSource" TEXT NOT NULL DEFAULT 'challenge';

CREATE TABLE IF NOT EXISTS "LobbyJoinQueue" (
  "id"           TEXT NOT NULL,
  "lobbyRoomId"  TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "planPriority" INTEGER NOT NULL DEFAULT 0,
  "requestedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LobbyJoinQueue_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyJoinQueue_lobbyRoomId_fkey') THEN
    ALTER TABLE "LobbyJoinQueue" ADD CONSTRAINT "LobbyJoinQueue_lobbyRoomId_fkey"
      FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyJoinQueue_userId_fkey') THEN
    ALTER TABLE "LobbyJoinQueue" ADD CONSTRAINT "LobbyJoinQueue_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyJoinQueue_lobbyRoomId_userId_key') THEN
    ALTER TABLE "LobbyJoinQueue" ADD CONSTRAINT "LobbyJoinQueue_lobbyRoomId_userId_key" UNIQUE ("lobbyRoomId", "userId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LobbyJoinQueue_lobbyRoomId_planPriority_requestedAt_idx"
  ON "LobbyJoinQueue"("lobbyRoomId", "planPriority" DESC, "requestedAt" ASC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LobbyMember_userId_key') THEN
    ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_userId_key" UNIQUE ("userId");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "RankedQueueEntry" (
  "id"           TEXT NOT NULL,
  "partyId"      TEXT NOT NULL,
  "leaderUserId" TEXT NOT NULL,
  "playerCount"  INTEGER NOT NULL,
  "avgElo"       INTEGER NOT NULL,
  "planPriority" INTEGER NOT NULL DEFAULT 0,
  "status"       TEXT NOT NULL DEFAULT 'searching',
  "joinedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedQueueEntry_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedQueueEntry_partyId_key') THEN
    ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_partyId_key" UNIQUE ("partyId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedQueueEntry_partyId_fkey') THEN
    ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_partyId_fkey"
      FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedQueueEntry_leaderUserId_fkey') THEN
    ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_leaderUserId_fkey"
      FOREIGN KEY ("leaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedQueueEntry_status_joinedAt_idx" ON "RankedQueueEntry"("status", "joinedAt");
CREATE INDEX IF NOT EXISTS "RankedQueueEntry_leaderUserId_idx" ON "RankedQueueEntry"("leaderUserId");

-- Ranked 2x2 lobby + post-match (2026-06-18)
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "lobbyRoomId" TEXT;
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "teamSize" INTEGER NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_lobbyRoomId_key') THEN
    ALTER TABLE "RankedMatchSession" ADD CONSTRAINT "RankedMatchSession_lobbyRoomId_key" UNIQUE ("lobbyRoomId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_lobbyRoomId_fkey') THEN
    ALTER TABLE "RankedMatchSession"
      ADD CONSTRAINT "RankedMatchSession_lobbyRoomId_fkey"
      FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedMatchSession_lobbyRoomId_idx" ON "RankedMatchSession"("lobbyRoomId");

-- RankedParty: config do time (2026-06-21)
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'BR';
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "minLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "maxLevel" INTEGER NOT NULL DEFAULT 20;

-- RankedParty: mapas pré-selecionados (2026-06-21)
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "mapPool" JSONB;

-- RankedParty activity log (2026-06-21)
CREATE TABLE IF NOT EXISTS "RankedPartyActivity" (
  "id" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "actorNickname" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedPartyActivity_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyActivity_partyId_fkey') THEN
    ALTER TABLE "RankedPartyActivity"
      ADD CONSTRAINT "RankedPartyActivity_partyId_fkey"
      FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedPartyActivity_partyId_createdAt_idx"
  ON "RankedPartyActivity"("partyId", "createdAt");

-- RankedParty chat messages (2026-06-21)
CREATE TABLE IF NOT EXISTS "RankedPartyMessage" (
  "id" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankedPartyMessage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMessage_partyId_fkey') THEN
    ALTER TABLE "RankedPartyMessage"
      ADD CONSTRAINT "RankedPartyMessage_partyId_fkey"
      FOREIGN KEY ("partyId") REFERENCES "RankedParty"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedPartyMessage_userId_fkey') THEN
    ALTER TABLE "RankedPartyMessage"
      ADD CONSTRAINT "RankedPartyMessage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedPartyMessage_partyId_createdAt_idx"
  ON "RankedPartyMessage"("partyId", "createdAt");

-- News + notification preferences + i18n keys (2026-06-21)
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "body" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "authorId" TEXT;

UPDATE "NewsArticle"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("title", '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || SUBSTRING("id", 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticle_slug_key" ON "NewsArticle"("slug");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NewsArticle_authorId_fkey') THEN
    ALTER TABLE "NewsArticle"
      ADD CONSTRAINT "NewsArticle_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");
CREATE INDEX IF NOT EXISTS "NewsArticle_authorId_idx" ON "NewsArticle"("authorId");

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "titleKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "bodyKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "params" JSONB;

CREATE TABLE IF NOT EXISTS "UserNotificationPreferences" (
  "userId" TEXT NOT NULL,
  "emailNewsletter" BOOLEAN NOT NULL DEFAULT true,
  "inAppMatch" BOOLEAN NOT NULL DEFAULT true,
  "inAppSocial" BOOLEAN NOT NULL DEFAULT true,
  "inAppPromo" BOOLEAN NOT NULL DEFAULT true,
  "inAppSystem" BOOLEAN NOT NULL DEFAULT true,
  "browserPush" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "UserNotificationPreferences_pkey" PRIMARY KEY ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserNotificationPreferences_userId_fkey') THEN
    ALTER TABLE "UserNotificationPreferences"
      ADD CONSTRAINT "UserNotificationPreferences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
