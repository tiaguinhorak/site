-- RankedParty: mapas pré-selecionados pelo líder para votação
ALTER TABLE "RankedParty" ADD COLUMN IF NOT EXISTS "mapPool" JSONB;
