import "server-only";

import type { CsgoAgentCatalog } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  lookupAgentFromApi,
  listAllAgentsFromApi,
  type AgentCatalogRowFromApi,
} from "@/lib/inventory/csgo-api-agent-index";
import { isLegacyCompatibleAgent, LEGACY_MIN_AGENT_DEFINDEX, LEGACY_MAX_AGENT_DEFINDEX } from "@/lib/inventory/agent-legacy-compat";

export type AgentCatalogAdminRow = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: string;
  modelPlayer: string | null;
  collection: string | null;
  enabled: boolean;
  source: string;
  updatedAt: string;
};

function serializeRow(row: CsgoAgentCatalog): AgentCatalogAdminRow {
  return {
    id: row.id,
    defIndex: row.defIndex,
    name: row.name,
    imageUrl: row.imageUrl,
    rarity: row.rarity,
    team: row.team,
    modelPlayer: row.modelPlayer,
    collection: row.collection,
    enabled: row.enabled,
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function upsertAgentRow(
  input: { defIndex: number; source: string; enabled?: boolean; id?: string },
  apiRow: AgentCatalogRowFromApi | null,
) {
  const existing = await prisma.csgoAgentCatalog.findUnique({
    where: { defIndex: input.defIndex },
  });

  const legacyCompatible = isLegacyCompatibleAgent(input.defIndex);
  const hasImage = Boolean(apiRow?.imageUrl ?? existing?.imageUrl);
  const canEnable = legacyCompatible && hasImage;

  const data = {
    defIndex: input.defIndex,
    name: apiRow?.name ?? existing?.name ?? `Agent ${input.defIndex}`,
    imageUrl: apiRow?.imageUrl ?? existing?.imageUrl ?? null,
    rarity: apiRow?.rarity ?? existing?.rarity ?? "comum",
    team: apiRow?.team ?? existing?.team ?? "T",
    modelPlayer: apiRow?.modelPlayer ?? existing?.modelPlayer ?? null,
    collection: apiRow?.collection ?? existing?.collection ?? null,
    enabled: canEnable ? (input.enabled ?? existing?.enabled ?? true) : false,
    source: existing?.source && existing.source !== "sync" ? existing.source : input.source,
  };

  const id = existing?.id ?? input.id ?? apiRow?.id ?? `agent-${input.defIndex}`;

  const row = await prisma.csgoAgentCatalog.upsert({
    where: { id },
    create: { id, ...data, source: input.source, enabled: input.enabled ?? true },
    update: data,
  });

  return serializeRow(row);
}

export async function lookupAgentCatalogPreview(defIndex: number) {
  const fromApi = await lookupAgentFromApi(defIndex);
  const existing = await prisma.csgoAgentCatalog.findUnique({ where: { defIndex } });
  return {
    found: fromApi !== null,
    api: fromApi,
    existing: existing ? serializeRow(existing) : null,
  };
}

export async function upsertAgentByDefIndex(defIndex: number, enabled = true) {
  const apiRow = await lookupAgentFromApi(defIndex);
  if (!apiRow) {
    throw new Error(`Agent def_index ${defIndex} não encontrado na CSGO-API.`);
  }
  return upsertAgentRow({ defIndex, source: "admin", enabled }, apiRow);
}

export async function importAllAgentsFromApi(options?: { enabled?: boolean }) {
  const agents = await listAllAgentsFromApi();
  let imported = 0;
  for (const agent of agents) {
    await upsertAgentRow(
      { defIndex: agent.defIndex, source: "import", enabled: options?.enabled ?? true },
      agent,
    );
    imported += 1;
  }
  return { imported };
}

/** Re-apply team/model from CSGO-API (fixes legacy mis-tagged CT agents). */
export async function resyncAgentCatalogTeamsFromApi() {
  const agents = await listAllAgentsFromApi();
  let updated = 0;
  for (const agent of agents) {
    await upsertAgentRow({ defIndex: agent.defIndex, source: "sync" }, agent);
    updated += 1;
  }
  return { updated };
}

export async function listAgentCatalogAdmin(options: {
  page?: number;
  limit?: number;
  search?: string;
  enabledOnly?: boolean;
  team?: "T" | "CT";
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 40));
  const search = options.search?.trim() ?? "";

  const where = {
    ...(options.enabledOnly ? { enabled: true } : {}),
    ...(options.team ? { team: options.team } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            ...(Number.isFinite(Number(search)) ? [{ defIndex: Number(search) }] : []),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.csgoAgentCatalog.findMany({
      where,
      orderBy: [{ enabled: "desc" }, { defIndex: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.csgoAgentCatalog.count({ where }),
  ]);

  return {
    items: items.map(serializeRow),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listEnabledAgentsForPicker(options: {
  search?: string;
  page?: number;
  limit?: number;
  team?: "T" | "CT";
}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(48, Math.max(1, options.limit ?? 24));
  const search = options.search?.trim() ?? "";

  const where = {
    enabled: true,
    ...(options.team ? { team: options.team } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            ...(Number.isFinite(Number(search)) ? [{ defIndex: Number(search) }] : []),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.csgoAgentCatalog.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.csgoAgentCatalog.count({ where }),
  ]);

  return {
    items: items.map(serializeRow),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function disableNonLegacyAgentsInCatalog() {
  const result = await prisma.csgoAgentCatalog.updateMany({
    where: {
      OR: [
        { defIndex: { lt: LEGACY_MIN_AGENT_DEFINDEX } },
        { defIndex: { gt: LEGACY_MAX_AGENT_DEFINDEX } },
      ],
    },
    data: { enabled: false },
  });
  return result.count;
}

let ensureAgentsPromise: Promise<void> | null = null;
let ensureAgentsLastRunAt = 0;
const ENSURE_AGENTS_TTL_MS = 5 * 60 * 1000;

export async function ensureLegacyAgentCatalogAndLoadouts() {
  if (Date.now() - ensureAgentsLastRunAt < ENSURE_AGENTS_TTL_MS) return;

  if (!ensureAgentsPromise) {
    ensureAgentsPromise = (async () => {
      const count = await prisma.csgoAgentCatalog.count();
      if (count === 0) {
        await importAllAgentsFromApi({ enabled: true });
      } else {
        await resyncAgentCatalogTeamsFromApi();
      }
      await disableNonLegacyAgentsInCatalog();
      ensureAgentsLastRunAt = Date.now();
    })().finally(() => {
      ensureAgentsPromise = null;
    });
  }
  await ensureAgentsPromise;
}

export async function deleteAgentCatalogEntry(id: string) {
  await prisma.csgoAgentCatalog.delete({ where: { id } });
}

export async function setAgentCatalogEnabled(id: string, enabled: boolean) {
  const row = await prisma.csgoAgentCatalog.update({
    where: { id },
    data: { enabled },
  });
  return serializeRow(row);
}
