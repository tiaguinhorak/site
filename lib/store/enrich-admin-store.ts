import "server-only";

import { prisma } from "@/lib/prisma";
import { serializeStoreReward, storeItemWithRewardsInclude } from "@/lib/store/serialize";

type StoreItemWithRewards = Awaited<
  ReturnType<
    typeof prisma.storeItem.findMany<{ include: typeof storeItemWithRewardsInclude }>
  >
>[number];

export async function enrichStoreItemsForAdmin(items: StoreItemWithRewards[]) {
  const agentDefIndexes = new Set<number>();
  for (const item of items) {
    for (const reward of item.rewards) {
      if (reward.kind === "AGENT" && reward.agentDefIndex) {
        agentDefIndexes.add(reward.agentDefIndex);
      }
    }
  }

  const agents =
    agentDefIndexes.size > 0
      ? await prisma.csgoAgentCatalog.findMany({
          where: { defIndex: { in: [...agentDefIndexes] } },
          select: { defIndex: true, name: true, imageUrl: true, team: true },
        })
      : [];
  const agentByDef = new Map(agents.map((row) => [row.defIndex, row]));

  return items.map((item) => ({
    ...item,
    rewards: item.rewards.map((reward) => {
      const base = serializeStoreReward(reward);
      if (reward.kind === "AGENT" && reward.agentDefIndex) {
        const agent = agentByDef.get(reward.agentDefIndex);
        if (agent) {
          return {
            ...base,
            label: agent.name,
            imageUrl: agent.imageUrl,
            agentTeam: agent.team,
          };
        }
      }
      return base;
    }),
  }));
}

export async function enrichSingleStoreItemForAdmin(item: StoreItemWithRewards) {
  const [enriched] = await enrichStoreItemsForAdmin([item]);
  return enriched;
}
