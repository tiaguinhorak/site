-- Notification content translations (EN / ES)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "translations" JSONB;
