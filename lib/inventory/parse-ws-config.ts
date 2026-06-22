/** Parse kgns !ws / !gloves config files (KeyValues) into weaponId + paintkit pairs. */

import { parseGlovesCfgEntries } from "@/lib/inventory/parse-gloves-cfg";

export type WsConfigEntry = {
  weaponId: string;
  paintkit: number;
};

export function parseWeaponsCfg(content: string): WsConfigEntry[] {
  const entries: WsConfigEntry[] = [];
  const blockRe = /\t"([^"]+)"\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(content)) !== null) {
    const body = match[2];
    const indexMatch = body.match(/"index"\s+"(\d+)"/);
    const classesMatch = body.match(/"classes"\s+"([^"]+)"/);
    if (!indexMatch || !classesMatch) continue;

    const paintkit = Number(indexMatch[1]);
    if (!Number.isFinite(paintkit) || paintkit <= 0) continue;

    for (const weaponId of classesMatch[1].split(";").map((c) => c.trim()).filter(Boolean)) {
      entries.push({ weaponId, paintkit });
    }
  }

  return entries;
}

export function parseGlovesCfg(content: string): WsConfigEntry[] {
  return parseGlovesCfgEntries(content);
}

export function wsConfigEntriesToKeys(entries: WsConfigEntry[]): Set<string> {
  const keys = new Set<string>();
  for (const e of entries) {
    keys.add(`${e.weaponId}:${e.paintkit}`);
  }
  return keys;
}

const KGNS_WEAPONS_CFG =
  "https://raw.githubusercontent.com/kgns/weapons/master/addons/sourcemod/configs/weapons";
const KGNS_GLOVES_CFG =
  "https://raw.githubusercontent.com/kgns/gloves/master/addons/sourcemod/configs/gloves";

export async function fetchWsAllowlistKeysFromGithub(lang = "english"): Promise<Set<string>> {
  const weaponsUrl = `${KGNS_WEAPONS_CFG}/weapons_${lang}.cfg`;
  const glovesUrl = `${KGNS_GLOVES_CFG}/gloves_${lang}.cfg`;

  const weaponsRes = await fetch(weaponsUrl, { cache: "no-store" });
  if (!weaponsRes.ok) {
    throw new Error(`Failed to fetch weapons config (${weaponsRes.status})`);
  }

  const weaponEntries = parseWeaponsCfg(await weaponsRes.text());
  let gloveEntries: WsConfigEntry[] = [];

  try {
    const glovesRes = await fetch(glovesUrl, { cache: "no-store" });
    if (glovesRes.ok) {
      gloveEntries = parseGlovesCfg(await glovesRes.text());
    }
  } catch {
    // gloves plugin optional
  }

  return wsConfigEntriesToKeys([...weaponEntries, ...gloveEntries]);
}
