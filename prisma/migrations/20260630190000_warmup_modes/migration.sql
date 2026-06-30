-- Warmup hub modes (admin-managed, maps per mode)

CREATE TABLE IF NOT EXISTS "WarmupMode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "modeLabel" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL DEFAULT 'Crosshair',
    "accent" TEXT NOT NULL DEFAULT 'from-violet-600 to-purple-800',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarmupMode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarmupMode_slug_key" ON "WarmupMode"("slug");
CREATE INDEX IF NOT EXISTS "WarmupMode_enabled_sortOrder_idx" ON "WarmupMode"("enabled", "sortOrder");

CREATE TABLE IF NOT EXISTS "WarmupModeMap" (
    "id" TEXT NOT NULL,
    "warmupModeId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WarmupModeMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarmupModeMap_warmupModeId_mapId_key"
  ON "WarmupModeMap"("warmupModeId", "mapId");
CREATE INDEX IF NOT EXISTS "WarmupModeMap_warmupModeId_idx" ON "WarmupModeMap"("warmupModeId");

ALTER TABLE "WarmupModeMap"
  ADD CONSTRAINT "WarmupModeMap_warmupModeId_fkey"
  FOREIGN KEY ("warmupModeId") REFERENCES "WarmupMode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
