import "dotenv/config";

/**
 * Baixa imagens das skins já salvas no Postgres para public/catalog/skins.
 * Rode após sync:skins se as imagens ainda apontarem para Steam CDN.
 */
import { createScriptPrismaClient } from "../lib/prisma-script";
import { catalogLocalImagePath, isLocalCatalogImageUrl } from "../lib/inventory/catalog-image-path";
import { mirrorCatalogImages } from "../lib/inventory/mirror-catalog-image";
import { clearCatalogMemoryCaches } from "../lib/inventory/catalog-ready-cache";
import { invalidateCatalogRedisKeys } from "../lib/redis/script-cache";

async function main() {
  const prisma = createScriptPrismaClient();
  const force = process.argv.includes("--force");

  const rows = await prisma.csgoSkinCatalog.findMany({
    select: { id: true, imageUrl: true },
    orderBy: { id: "asc" },
  });

  console.log(`Mirroring ${rows.length} catalog images → public/catalog/skins …`);
  const result = await mirrorCatalogImages(rows, {
    force,
    concurrency: 10,
    onProgress: (done, total) => {
      if (done % 100 === 0 || done === total) {
        console.log(`[images] ${done}/${total}`);
      }
    },
  });

  let updated = 0;
  for (const row of rows) {
    const expected = catalogLocalImagePath(row.id);
    if (row.imageUrl !== expected && (force || !isLocalCatalogImageUrl(row.imageUrl))) {
      await prisma.csgoSkinCatalog.update({
        where: { id: row.id },
        data: { imageUrl: expected },
      });
      updated += 1;
    }
  }

  clearCatalogMemoryCaches();
  await invalidateCatalogRedisKeys();

  console.log(
    `Done. mirrored=${result.mirrored} skipped=${result.skipped} failed=${result.failed} dbUpdated=${updated}`,
  );
  if (result.errors.length > 0) {
    console.warn("Sample errors:", result.errors.slice(0, 5).join("\n"));
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
