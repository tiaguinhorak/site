import "dotenv/config";
import { createScriptPrismaClient } from "../lib/prisma-script";
import { refreshAllLinkedSteamProfiles } from "../lib/steam/sync-profiles-core";

async function main() {
  if (!process.env.STEAM_API_KEY?.trim()) {
    console.error("STEAM_API_KEY não definida no .env");
    process.exit(1);
  }

  const limit = Number(process.argv[2] ?? 500);
  console.log(`[sync-steam-profiles] Atualizando até ${limit} usuários com Steam vinculada...`);

  const prisma = createScriptPrismaClient();
  try {
    const result = await refreshAllLinkedSteamProfiles(prisma, { limit });
    console.log(
      `[sync-steam-profiles] total=${result.total} updated=${result.updated} skipped=${result.skipped} failed=${result.failed}`,
    );

    if (result.failed > 0) {
      console.warn(
        "[sync-steam-profiles] Alguns perfis falharam (perfil privado, API ou steamId inválido).",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[sync-steam-profiles]", error);
  process.exit(1);
});
