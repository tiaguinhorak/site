-- Multi-server ranked: link session to api-csgo server registry id
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "csgoServerId" TEXT;

CREATE INDEX IF NOT EXISTS "RankedMatchSession_csgoServerId_idx" ON "RankedMatchSession"("csgoServerId");
