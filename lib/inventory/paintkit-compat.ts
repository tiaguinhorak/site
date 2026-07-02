import { isInWsAllowlist } from "@/lib/inventory/ws-allowlist";

/** Server runs CS:GO — paintkits in kgns !ws list work in-game; CSGO-API also lists CS2-only skins. */
export type CatalogGameClient = "csgo" | "cs2" | "unknown";

export type PaintkitCompatResult = {
  gameClient: CatalogGameClient;
  csgoCompatible: boolean;
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

export function isCatalogGameClientCsgo(gameClient: string | null | undefined): boolean {
  return gameClient === "csgo";
}

export function isCatalogGameClientCs2(gameClient: string | null | undefined): boolean {
  return gameClient === "cs2";
}
