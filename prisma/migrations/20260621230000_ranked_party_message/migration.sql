-- RankedParty chat messages (room chat)
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
