import "dotenv/config";

/**
 * Importa o catálogo CS:GO (CSGO-API) no Postgres — rode UMA vez (ou após patch grande do CS).
 * O site NÃO chama API externa ao abrir inventário; só lê CsgoSkinCatalog no banco.
 */
import { createScriptPrismaClient } from "../lib/prisma-script";
import { syncCsgoSkinCatalogWithClient } from "../lib/inventory/sync-csgo-catalog-core";

async function main() {
  const prisma = createScriptPrismaClient();
  console.log("Syncing CS:GO skin catalog → Postgres (one-time cache)…");
  const result = await syncCsgoSkinCatalogWithClient(prisma);
  console.log(`Done. ${result.synced} skins in database. Site reads DB only — no external API on visits.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
