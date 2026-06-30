-- Traduções automáticas (en/es) para conteúdo manual do admin
ALTER TABLE "StoreItem" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "GameMode" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "GameModeRoom" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "MarketingFeature" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "SiteStat" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "WarmupMode" ADD COLUMN IF NOT EXISTS "translations" JSONB;
