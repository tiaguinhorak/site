-- Ranked 2x2 lobby + post-match (idempotent — safe after baseline init)
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "lobbyRoomId" TEXT;
ALTER TABLE "RankedMatchSession" ADD COLUMN IF NOT EXISTS "teamSize" INTEGER NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_lobbyRoomId_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'RankedMatchSession_lobbyRoomId_key'
  ) THEN
    ALTER TABLE "RankedMatchSession"
      ADD CONSTRAINT "RankedMatchSession_lobbyRoomId_key" UNIQUE ("lobbyRoomId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankedMatchSession_lobbyRoomId_fkey') THEN
    ALTER TABLE "RankedMatchSession"
      ADD CONSTRAINT "RankedMatchSession_lobbyRoomId_fkey"
      FOREIGN KEY ("lobbyRoomId") REFERENCES "LobbyRoom"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "RankedMatchSession_lobbyRoomId_idx" ON "RankedMatchSession"("lobbyRoomId");
