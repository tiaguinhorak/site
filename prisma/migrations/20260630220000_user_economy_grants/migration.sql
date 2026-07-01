-- CreateTable
CREATE TABLE "UserEconomyGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "StoreRewardKind" NOT NULL,
    "defIndex" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEconomyGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEconomyGrant_userId_idx" ON "UserEconomyGrant"("userId");

-- CreateIndex
CREATE INDEX "UserEconomyGrant_userId_kind_idx" ON "UserEconomyGrant"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "UserEconomyGrant_userId_kind_defIndex_key" ON "UserEconomyGrant"("userId", "kind", "defIndex");

-- AddForeignKey
ALTER TABLE "UserEconomyGrant" ADD CONSTRAINT "UserEconomyGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
