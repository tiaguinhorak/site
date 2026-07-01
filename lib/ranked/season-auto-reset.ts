import "server-only";

import { prisma } from "@/lib/prisma";
import { resetRankedSeason, RankedSeasonError } from "@/lib/ranked/season-service";

export type SeasonAutoResetResult = {
  seasonId: string;
  seasonName: string;
  ok: boolean;
  error?: string;
};

/**
 * Encerra temporadas ativas cujo `resetAt` (ou `endsAt` se reset não definido) já passou:
 * arquiva ranking, entrega prêmios do top 3 e zera stats rankeados.
 */
export async function processDueSeasonResets(
  now = new Date(),
): Promise<{ checked: number; results: SeasonAutoResetResult[] }> {
  const dueSeasons = await prisma.rankedSeason.findMany({
    where: {
      active: true,
      status: "ACTIVE",
      OR: [
        { resetAt: { not: null, lte: now } },
        { resetAt: null, endsAt: { not: null, lte: now } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { resetAt: "asc" },
  });

  const results: SeasonAutoResetResult[] = [];

  for (const season of dueSeasons) {
    try {
      await resetRankedSeason(season.id, undefined, {
        grantPrizes: true,
        archiveStandings: true,
      });
      results.push({ seasonId: season.id, seasonName: season.name, ok: true });
    } catch (error) {
      const message =
        error instanceof RankedSeasonError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Falha ao encerrar temporada.";
      results.push({
        seasonId: season.id,
        seasonName: season.name,
        ok: false,
        error: message,
      });
    }
  }

  return { checked: dueSeasons.length, results };
}
