-- RankedParty: campos de configuração do time (nome, região, visibilidade, senha, restrição de nível)
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'BR';
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "minLevel" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "maxLevel" INTEGER NOT NULL DEFAULT 20;
