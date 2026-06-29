type AgentLoadoutItem = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  imageUrl: string | null;
  equippedT: boolean;
  equippedCT: boolean;
};

export type AgentLoadoutFromItems = {
  agentT: number;
  agentCT: number;
  agentTName: string | null;
  agentCTName: string | null;
  agentTImage: string | null;
  agentCTImage: string | null;
};

function defIndexFromAgentEntry(entry: AgentLoadoutItem): number {
  const match = entry.catalogSkinId.match(/^agent-(?:t|ct)-(\d+)$/i);
  if (match) return Number(match[1]);
  const fromId = Number(entry.catalogSkinId.replace(/\D/g, ""));
  return Number.isFinite(fromId) ? fromId : 0;
}

export function agentLoadoutFromEquippedItems(
  items: AgentLoadoutItem[],
): AgentLoadoutFromItems {
  const agentT = items.find((i) => i.weaponId === "agent_t" && i.equippedT);
  const agentCT = items.find((i) => i.weaponId === "agent_ct" && i.equippedCT);

  return {
    agentT: agentT ? defIndexFromAgentEntry(agentT) : 0,
    agentCT: agentCT ? defIndexFromAgentEntry(agentCT) : 0,
    agentTName: agentT?.name ?? null,
    agentCTName: agentCT?.name ?? null,
    agentTImage: agentT?.imageUrl ?? null,
    agentCTImage: agentCT?.imageUrl ?? null,
  };
}
