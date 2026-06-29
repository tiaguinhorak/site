import "server-only";

import { prisma } from "@/lib/prisma";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { steamIdForGamePlugin } from "@/lib/steam/steam-id";
import { lookupAgentFromApi } from "@/lib/inventory/csgo-api-agent-index";
import { skinPreviewImageUrl } from "@/lib/inventory/skin-images";
import {
  agentModelPlayerToGamePath,
  isLegacyCompatibleAgent,
} from "@/lib/inventory/agent-legacy-compat";
import { getInventoryPlanLimits } from "@/lib/inventory/plan-inventory-access";

export type PlayerAgentLoadout = {
  agentT: number;
  agentCT: number;
  agentTName: string | null;
  agentCTName: string | null;
  agentTImage: string | null;
  agentCTImage: string | null;
};

export type AgentSyncEntry = {
  team: LoadoutTeam;
  defIndex: number;
  modelPath: string;
};

async function resolveAgentMeta(defIndex: number) {
  if (defIndex <= 0 || !isLegacyCompatibleAgent(defIndex)) {
    return null;
  }

  const catalog = await prisma.csgoAgentCatalog.findUnique({ where: { defIndex } });
  if (catalog && !catalog.enabled) return null;

  const modelPlayer = catalog?.modelPlayer ?? (await lookupAgentFromApi(defIndex))?.modelPlayer;
  const modelPath = agentModelPlayerToGamePath(modelPlayer);
  if (!modelPath) return null;

  return {
    defIndex,
    name: catalog?.name ?? (await lookupAgentFromApi(defIndex))?.name ?? `Agent ${defIndex}`,
    imageUrl: skinPreviewImageUrl(
      catalog?.imageUrl ?? (await lookupAgentFromApi(defIndex))?.imageUrl ?? null,
    ),
    team: (catalog?.team ?? "T") as LoadoutTeam,
    modelPath,
  };
}

async function sanitizeAgentForTeam(
  defIndex: number,
  team: LoadoutTeam,
): Promise<number> {
  if (defIndex <= 0) return 0;
  const meta = await resolveAgentMeta(defIndex);
  if (!meta) return 0;
  if (meta.team !== team) return 0;
  return meta.defIndex;
}

export async function getPlayerAgents(steamId64: string): Promise<PlayerAgentLoadout> {
  const row = await prisma.csgoPlayerAgent.findUnique({ where: { steamId: steamId64 } });
  const agentT = row?.agentT ?? 0;
  const agentCT = row?.agentCT ?? 0;

  const metaT = agentT > 0 ? await resolveAgentMeta(agentT) : null;
  const metaCT = agentCT > 0 ? await resolveAgentMeta(agentCT) : null;

  return {
    agentT: metaT?.defIndex ?? 0,
    agentCT: metaCT?.defIndex ?? 0,
    agentTName: metaT?.name ?? null,
    agentCTName: metaCT?.name ?? null,
    agentTImage: metaT?.imageUrl ?? null,
    agentCTImage: metaCT?.imageUrl ?? null,
  };
}

export async function savePlayerAgent(
  steamId64: string,
  team: LoadoutTeam,
  defIndex: number,
  options?: { planCanUse?: boolean },
): Promise<PlayerAgentLoadout> {
  if (options?.planCanUse === false && defIndex > 0) {
    throw new Error("Seu plano não permite equipar agentes.");
  }

  const sanitized = await sanitizeAgentForTeam(defIndex, team);
  const field = team === "T" ? "agentT" : "agentCT";

  await prisma.csgoPlayerAgent.upsert({
    where: { steamId: steamId64 },
    create: {
      steamId: steamId64,
      agentT: team === "T" ? sanitized : 0,
      agentCT: team === "CT" ? sanitized : 0,
    },
    update: { [field]: sanitized },
  });

  return getPlayerAgents(steamId64);
}

export async function clearPlayerAgent(steamId64: string, team: LoadoutTeam): Promise<PlayerAgentLoadout> {
  return savePlayerAgent(steamId64, team, 0);
}

export async function getPlayerAgentsForSync(steamId64: string): Promise<{
  steamId: string;
  entries: AgentSyncEntry[];
}> {
  const pluginSteamId = steamIdForGamePlugin(steamId64);
  const loadout = await getPlayerAgents(steamId64);
  const entries: AgentSyncEntry[] = [];

  if (loadout.agentT > 0) {
    const meta = await resolveAgentMeta(loadout.agentT);
    if (meta) {
      entries.push({ team: "T", defIndex: meta.defIndex, modelPath: meta.modelPath });
    }
  }

  if (loadout.agentCT > 0) {
    const meta = await resolveAgentMeta(loadout.agentCT);
    if (meta) {
      entries.push({ team: "CT", defIndex: meta.defIndex, modelPath: meta.modelPath });
    }
  }

  return { steamId: pluginSteamId, entries };
}

export async function savePlayerAgentsForUser(
  userId: string,
  team: LoadoutTeam,
  defIndex: number,
): Promise<{ loadout: PlayerAgentLoadout; steamId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user?.steamId) {
    throw new Error("Vincule sua Steam no perfil para equipar agentes.");
  }

  const limits = await getInventoryPlanLimits(userId);
  const loadout = await savePlayerAgent(user.steamId, team, defIndex, {
    planCanUse: limits.canUseAgents,
  });

  return { loadout, steamId: user.steamId };
}
