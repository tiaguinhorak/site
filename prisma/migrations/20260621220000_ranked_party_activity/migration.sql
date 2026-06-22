-- RankedParty activity log (join/leave/kick)
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
