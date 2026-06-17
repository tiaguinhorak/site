-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
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
    "steamProfileUrl" TEXT,
    "steamCountryCode" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("anticheatInstalled", "avatarUrl", "bio", "country", "createdAt", "elo", "email", "firstName", "hoursPlayed", "id", "kd", "lastName", "matches", "mfaEnabled", "mfaSecret", "nickname", "passwordHash", "phone", "plan", "rank", "steamAvatarUrl", "steamCountryCode", "steamId", "steamPersonaName", "steamProfileUrl", "updatedAt", "winRate") SELECT "anticheatInstalled", "avatarUrl", "bio", "country", "createdAt", "elo", "email", "firstName", "hoursPlayed", "id", "kd", "lastName", "matches", "mfaEnabled", "mfaSecret", "nickname", "passwordHash", "phone", "plan", "rank", "steamAvatarUrl", "steamCountryCode", "steamId", "steamPersonaName", "steamProfileUrl", "updatedAt", "winRate" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");
CREATE INDEX "User_rank_idx" ON "User"("rank");
CREATE INDEX "User_elo_idx" ON "User"("elo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
