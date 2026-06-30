-- Clan / Guild system.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanRole') THEN
    CREATE TYPE "ClanRole" AS ENUM ('OWNER', 'OFFICER', 'MEMBER');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "Clan" (
  "id" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "avatarUrl" TEXT,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Clan_tag_key" ON "Clan"("tag");
CREATE UNIQUE INDEX IF NOT EXISTS "Clan_name_key" ON "Clan"("name");
CREATE INDEX IF NOT EXISTS "Clan_ownerId_idx" ON "Clan"("ownerId");

CREATE TABLE IF NOT EXISTS "ClanMember" (
  "id" TEXT NOT NULL,
  "clanId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClanMember_userId_key" ON "ClanMember"("userId");
CREATE INDEX IF NOT EXISTS "ClanMember_clanId_idx" ON "ClanMember"("clanId");
CREATE INDEX IF NOT EXISTS "ClanMember_userId_idx" ON "ClanMember"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Clan_ownerId_fkey') THEN
    ALTER TABLE "Clan" ADD CONSTRAINT "Clan_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClanMember_clanId_fkey') THEN
    ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_clanId_fkey"
      FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClanMember_userId_fkey') THEN
    ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
