import "dotenv/config";

/**
 * Importa catálogo CS:GO no Postgres + espelha imagens localmente.
 * Rode UMA vez (ou após patch grande do CS). O site só lê do banco em runtime.
 */
import { createScriptPrismaClient } from "../lib/prisma-script";
import { clearCatalogMemoryCaches } from "../lib/inventory/catalog-ready-cache";
import { invalidateCatalogRedisKeys } from "../lib/redis/script-cache";
import { syncCsgoSkinCatalogWithClient } from "../lib/inventory/sync-csgo-catalog-core";

async function main() {
  const prisma = createScriptPrismaClient();
  const skipImages = process.argv.includes("--skip-images");

  console.log("Syncing CS:GO skin catalog → Postgres + local images …");
  const result = await syncCsgoSkinCatalogWithClient(prisma, {
    mirrorImages: !skipImages,
  });
  clearCatalogMemoryCaches();
  await invalidateCatalogRedisKeys();
  console.log(
    `Done. ${result.synced} skins upserted, ${result.imagesMirrored} images mirrored (ws-only: ${result.wsOnly ? "yes" : "all"}).`,
  );

  const byCat = await prisma.csgoSkinCatalog.groupBy({ by: ["category"], _count: true });
  console.log("By category:", byCat.map((r) => `${r.category}=${r._count}`).join(", "));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
