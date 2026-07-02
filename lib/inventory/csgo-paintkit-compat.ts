import "server-only";

import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  classifyPaintkitGameClient,
  isCatalogGameClientCs2,
  isCatalogGameClientCsgo,
  type CatalogGameClient,
  type PaintkitCompatResult,
} from "@/lib/inventory/paintkit-compat";
import {
  fetchWsAllowlistKeys,
  wsCatalogKey,
} from "@/lib/inventory/ws-allowlist";

export type { CatalogGameClient, PaintkitCompatResult };
export {
  classifyPaintkitGameClient,
  isCatalogGameClientCs2,
  isCatalogGameClientCsgo,
};

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
