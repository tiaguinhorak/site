import "dotenv/config";
import { getSteamApiKey } from "../lib/steam/api-key";
import { probeSteamPlayerSummariesApi } from "../lib/steam/profile";
import { createScriptPrismaClient } from "../lib/prisma-script";
import { refreshAllLinkedSteamProfiles } from "../lib/steam/sync-profiles-core";

async function main() {
  const apiKey = getSteamApiKey();
  if (!apiKey) {
    console.error("[sync-steam-profiles] STEAM_API_KEY não definida no .env");
    process.exit(1);
  }

  console.log(`[sync-steam-profiles] STEAM_API_KEY ok (len=${apiKey.length})`);

  const probe = await probeSteamPlayerSummariesApi();
  console.log(
    `[sync-steam-profiles] probe HTTP=${probe.httpStatus ?? "—"} players=${probe.playerCount}`,
  );
  if (!probe.ok) {
    console.error(`[sync-steam-profiles] API Steam indisponível: ${probe.error ?? "erro desconhecido"}`);
    console.error(
      "[sync-steam-profiles] Verifique a chave em https://steamcommunity.com/dev/apikey (domínio do VPS).",
    );
    process.exit(1);
  }

  const limit = Number(process.argv[2] ?? 500);
  console.log(`[sync-steam-profiles] Atualizando até ${limit} usuários com Steam vinculada...`);

  const prisma = createScriptPrismaClient();
  try {
    const result = await refreshAllLinkedSteamProfiles(prisma, { limit });
    console.log(
      `[sync-steam-profiles] total=${result.total} updated=${result.updated} skipped=${result.skipped} failed=${result.failed} invalidSteamId=${result.invalidSteamId}`,
    );

    if (result.apiHttpStatus != null) {
      console.log(`[sync-steam-profiles] API HTTP=${result.apiHttpStatus}`);
    }
    if (result.apiError) {
      console.warn(`[sync-steam-profiles] API error: ${result.apiError}`);
    }

    if (result.invalidSteamId > 0) {
      console.warn(
        `[sync-steam-profiles] ${result.invalidSteamId} usuário(s) com steamId inválido no Postgres (precisa relink Steam).`,
      );
    }

    if (result.failed > 0 && result.updated === 0) {
      const sample = await prisma.user.findMany({
        where: { steamId: { not: null } },
        select: { nickname: true, steamId: true },
        take: 3,
      });
      console.warn("[sync-steam-profiles] Amostra steamId no banco:");
      for (const row of sample) {
        console.warn(`  - ${row.nickname}: ${row.steamId}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[sync-steam-profiles]", error);
  process.exit(1);
});
