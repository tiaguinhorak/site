import "server-only";

import { prisma } from "@/lib/prisma";

export type AgentPreviewMeta = {
  name: string;
  imageUrl: string | null;
  team: string;
};

export async function loadAgentPreviewMap(
  defIndexes: number[],
): Promise<Map<number, AgentPreviewMeta>> {
  if (defIndexes.length === 0) return new Map();

  const rows = await prisma.csgoAgentCatalog.findMany({
    where: { defIndex: { in: defIndexes } },
    select: { defIndex: true, name: true, imageUrl: true, team: true },
  });

  return new Map(
    rows.map((row) => [
      row.defIndex,
      { name: row.name, imageUrl: row.imageUrl, team: row.team },
    ]),
  );
}

export function collectAgentDefIndexesFromStoreItems(
  items: { rewards?: { kind: string; agentDefIndex: number | null }[] }[],
): number[] {
  const set = new Set<number>();
  for (const item of items) {
    for (const reward of item.rewards ?? []) {
      if (reward.kind === "AGENT" && reward.agentDefIndex) {
        set.add(reward.agentDefIndex);
      }
    }
  }
  return [...set];
}
