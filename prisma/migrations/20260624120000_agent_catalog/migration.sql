-- CreateTable
CREATE TABLE "CsgoAgentCatalog" (
    "id" TEXT NOT NULL,
    "defIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "rarity" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "modelPlayer" TEXT,
    "collection" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'import',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsgoAgentCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsgoPlayerAgent" (
    "id" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "agentT" INTEGER NOT NULL DEFAULT 0,
    "agentCT" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsgoPlayerAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CsgoAgentCatalog_defIndex_key" ON "CsgoAgentCatalog"("defIndex");

-- CreateIndex
CREATE INDEX "CsgoAgentCatalog_enabled_idx" ON "CsgoAgentCatalog"("enabled");

-- CreateIndex
CREATE INDEX "CsgoAgentCatalog_team_idx" ON "CsgoAgentCatalog"("team");

-- CreateIndex
CREATE UNIQUE INDEX "CsgoPlayerAgent_steamId_key" ON "CsgoPlayerAgent"("steamId");

-- CreateIndex
CREATE INDEX "CsgoPlayerAgent_steamId_idx" ON "CsgoPlayerAgent"("steamId");
