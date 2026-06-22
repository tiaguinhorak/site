import { WEAR_FLOAT } from "@/lib/csgo-api/serializers";

export const CLUTCH_SKINS_KV_ROOT = "ClutchSkins";

export type SkinExportWeapon = {
  weaponId: string;
  paintkit: number;
  wear: string;
  seed: number;
  stattrak: boolean;
  stattrakCount: number;
  nametag?: string | null;
};

export function formatClutchSkinsKeyValues(
  loadouts: Array<{ steamId: string; weapons: SkinExportWeapon[] }>,
): string {
  const lines: string[] = [`"${CLUTCH_SKINS_KV_ROOT}"`, "{"];

  for (const loadout of loadouts) {
    if (!loadout.weapons.length) continue;
    lines.push(`    "${loadout.steamId}"`, "    {");
    for (const w of loadout.weapons) {
      lines.push(`        "${w.weaponId}"`, "        {");
      lines.push(`            "paintkit"    "${w.paintkit}"`);
      lines.push(`            "wear"        "${WEAR_FLOAT[w.wear] ?? "0.15"}"`);
      lines.push(`            "seed"        "${w.seed}"`);
      if (w.stattrak) {
        lines.push(`            "stattrak"    "${w.stattrakCount || 0}"`);
      }
      if (w.nametag) {
        lines.push(`            "nametag"     "${escapeKvString(w.nametag)}"`);
      }
      lines.push("        }");
    }
    lines.push("    }");
  }

  lines.push("}");
  return lines.join("\n");
}

function escapeKvString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
