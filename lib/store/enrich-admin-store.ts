import "server-only";

import { prisma } from "@/lib/prisma";
import { loadAgentPreviewMap, collectAgentDefIndexesFromStoreItems } from "@/lib/store/agent-preview-map";
import { serializeStoreReward, storeItemWithRewardsInclude } from "@/lib/store/serialize";

type StoreItemWithRewards = Awaited<
  ReturnType<
    typeof prisma.storeItem.findMany<{ include: typeof storeItemWithRewardsInclude }>
  >
>[number];

export async function enrichStoreItemsForAdmin(items: StoreItemWithRewards[]) {
  const agentByDef = await loadAgentPreviewMap(collectAgentDefIndexesFromStoreItems(items));

  return items.map((item) => ({
    ...item,
    rewards: item.rewards.map((reward) => serializeStoreReward(reward, { agentByDef })),
  }));
}

export async function enrichSingleStoreItemForAdmin(item: StoreItemWithRewards) {
  const [enriched] = await enrichStoreItemsForAdmin([item]);
  return enriched;
}
