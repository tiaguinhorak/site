import "server-only";

import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  fetchWsAllowlistKeys,
  isInWsAllowlist,
  wsCatalogKey,
} from "@/lib/inventory/ws-allowlist";

/** Server runs CS:GO — paintkits in kgns !ws list work in-game; CSGO-API also lists CS2-only skins. */
export type CatalogGameClient = "csgo" | "cs2" | "unknown";

export type PaintkitCompatResult = {
  gameClient: CatalogGameClient;
  csgoCompatible: boolean;
  /** Human-readable reason for admin UI. */
  reason: string;
};

export function classifyPaintkitGameClient(
  weaponId: string,
  paintkit: number,
  allowlist: Set<string>,
  inCsgoApi = true,
): PaintkitCompatResult {
  if (allowlist.size > 0 && isInWsAllowlist(weaponId, paintkit, allowlist)) {
    return {
      gameClient: "csgo",
      csgoCompatible: true,
      reason: "Compatível com CS:GO (!ws / kgns weapons list).",
    };
  }

  if (inCsgoApi) {
    return {
      gameClient: "cs2",
      csgoCompatible: false,
      reason:
        "Skin listada na CSGO-API mas fora da lista CS:GO (!ws). Provável skin do CS2 — não renderiza no servidor CS:GO.",
    };
  }

  return {
    gameClient: "cs2",
    csgoCompatible: false,
    reason: "Paintkit não encontrado na lista CS:GO (!ws).",
  };
}

export async function resolvePaintkitCompat(
  weaponId: string,
  paintkit: number,
  inCsgoApi = true,
): Promise<PaintkitCompatResult> {
  const allowlist = await fetchWsAllowlistKeys();
  return classifyPaintkitGameClient(weaponId, paintkit, allowlist, inCsgoApi);
}

export async function assertPaintkitCsgoCompatible(
  weaponId: string,
  paintkit: number,
  inCsgoApi = true,
): Promise<void> {
  const compat = await resolvePaintkitCompat(weaponId, paintkit, inCsgoApi);
  if (!compat.csgoCompatible) {
    throw new CsgoApiError(
      `Skin bloqueada (${compat.gameClient === "cs2" ? "CS2" : "incompatível"}): ${compat.reason}`,
      400,
    );
  }
}

export function isCatalogGameClientCsgo(gameClient: string | null | undefined): boolean {
  return gameClient === "csgo";
}

export function isCatalogGameClientCs2(gameClient: string | null | undefined): boolean {
  return gameClient === "cs2";
}

/** Bulk classify for catalog sync / admin backfill. */
export async function classifyCatalogRowsGameClient(
  rows: Array<{ weaponId: string; paintkit: number }>,
  inCsgoApiByKey?: Set<string>,
): Promise<Map<string, CatalogGameClient>> {
  const allowlist = await fetchWsAllowlistKeys();
  const result = new Map<string, CatalogGameClient>();

  for (const row of rows) {
    const key = wsCatalogKey(row.weaponId, row.paintkit);
    const inApi = inCsgoApiByKey?.has(key) ?? true;
    result.set(key, classifyPaintkitGameClient(row.weaponId, row.paintkit, allowlist, inApi).gameClient);
  }

  return result;
}
