-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NewsArticle_archivedAt_idx" ON "NewsArticle"("archivedAt");
