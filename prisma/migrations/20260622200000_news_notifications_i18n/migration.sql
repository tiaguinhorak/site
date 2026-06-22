-- News i18n + author, notification keys, user preferences (safe / idempotent)

ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "body" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "authorId" TEXT;

UPDATE "NewsArticle"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("title", '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || SUBSTRING("id", 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "NewsArticle" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticle_slug_key" ON "NewsArticle"("slug");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NewsArticle_authorId_fkey') THEN
    ALTER TABLE "NewsArticle"
      ADD CONSTRAINT "NewsArticle_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");
CREATE INDEX IF NOT EXISTS "NewsArticle_authorId_idx" ON "NewsArticle"("authorId");

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "titleKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "bodyKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "params" JSONB;

CREATE TABLE IF NOT EXISTS "UserNotificationPreferences" (
  "userId" TEXT NOT NULL,
  "emailNewsletter" BOOLEAN NOT NULL DEFAULT true,
  "inAppMatch" BOOLEAN NOT NULL DEFAULT true,
  "inAppSocial" BOOLEAN NOT NULL DEFAULT true,
  "inAppPromo" BOOLEAN NOT NULL DEFAULT true,
  "inAppSystem" BOOLEAN NOT NULL DEFAULT true,
  "browserPush" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "UserNotificationPreferences_pkey" PRIMARY KEY ("userId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserNotificationPreferences_userId_fkey') THEN
    ALTER TABLE "UserNotificationPreferences"
      ADD CONSTRAINT "UserNotificationPreferences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
