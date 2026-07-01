import "server-only";

import { getActiveRankedSeasonId } from "@/lib/ranked/season-service";

/** Resolves the active ranked season id for tagging new match sessions. */
export async function resolveRankedMatchSeasonId(): Promise<string | undefined> {
  const id = await getActiveRankedSeasonId();
  return id ?? undefined;
}
