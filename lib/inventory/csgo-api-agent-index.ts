import "server-only";

export const CSGO_API_AGENTS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json";

export type CsgoApiAgent = {
  id: string;
  name: string;
  image?: string;
  def_index?: string | number;
  rarity?: { id?: string; name?: string };
  team?: { id?: string; name?: string };
  model_player?: string;
  collections?: Array<{ name?: string }>;
};

export type AgentCatalogRowFromApi = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: "T" | "CT";
  modelPlayer: string | null;
  collection: string | null;
};

type IndexCache = {
  at: number;
  byDefIndex: Map<number, CsgoApiAgent>;
  agents: CsgoApiAgent[];
};

const CACHE_MS = 60 * 60 * 1000;
let cache: IndexCache | null = null;
let loadPromise: Promise<IndexCache> | null = null;

function rarityLabel(rarity?: { id?: string; name?: string }): string {
  if (rarity?.name) return rarity.name.toLowerCase();
  const map: Record<string, string> = {
    rarity_legendary_character: "lendário",
    rarity_mythical_character: "épico",
    rarity_rare_character: "raro",
    rarity_uncommon_character: "incomum",
    rarity_common_character: "comum",
  };
  return map[rarity?.id ?? ""] ?? "comum";
}

function teamFromApi(team?: { id?: string; name?: string }): "T" | "CT" | null {
  const id = team?.id?.toLowerCase() ?? "";
  // counter-terrorists also contains "terrorist" — check CT first
  if (id.includes("counter")) return "CT";
  if (id.includes("terrorist")) return "T";
  return null;
}

export function apiAgentToCatalogRow(agent: CsgoApiAgent): AgentCatalogRowFromApi | null {
  const defIndex = Number(agent.def_index);
  if (!Number.isFinite(defIndex) || defIndex <= 0) return null;
  const team = teamFromApi(agent.team);
  if (!team) return null;

  return {
    id: agent.id,
    defIndex,
    name: agent.name,
    imageUrl: agent.image ?? null,
    rarity: rarityLabel(agent.rarity),
    team,
    modelPlayer: agent.model_player ?? null,
    collection: agent.collections?.[0]?.name ?? null,
  };
}

async function buildIndex(): Promise<IndexCache> {
  const response = await fetch(CSGO_API_AGENTS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao baixar agents CSGO-API (${response.status}).`);
  }

  const payload = (await response.json()) as CsgoApiAgent[];
  const byDefIndex = new Map<number, CsgoApiAgent>();

  for (const agent of payload) {
    const defIndex = Number(agent.def_index);
    if (!Number.isFinite(defIndex) || defIndex <= 0) continue;
    byDefIndex.set(defIndex, agent);
  }

  return { at: Date.now(), byDefIndex, agents: payload };
}

async function getIndex(): Promise<IndexCache> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  if (!loadPromise) {
    loadPromise = buildIndex().finally(() => {
      loadPromise = null;
    });
  }
  cache = await loadPromise;
  return cache;
}

export async function listAllAgentsFromApi(): Promise<AgentCatalogRowFromApi[]> {
  const index = await getIndex();
  const rows: AgentCatalogRowFromApi[] = [];
  for (const agent of index.agents) {
    const row = apiAgentToCatalogRow(agent);
    if (row) rows.push(row);
  }
  return rows;
}

export async function lookupAgentFromApi(defIndex: number): Promise<AgentCatalogRowFromApi | null> {
  const index = await getIndex();
  const agent = index.byDefIndex.get(defIndex);
  if (!agent) return null;
  return apiAgentToCatalogRow(agent);
}
