/** Parse kgns gloves_*.cfg — glove type defindex (4xxx–5xxx) + paintkit (10000+). */

const GLOVE_DEFINDEX_TO_WEAPON_ID: Record<number, string> = {
  5027: "studded_bloodhound_gloves",
  5030: "sporty_gloves",
  5031: "slick_gloves",
  5032: "leather_handwraps",
  5033: "motorcycle_gloves",
  5034: "specialist_gloves",
  5035: "studded_hydra_gloves",
  4725: "studded_brokenfang_gloves",
};

export type GloveCfgEntry = {
  weaponId: string;
  paintkit: number;
};

function isGloveTypeDefIndex(index: number): boolean {
  return index >= 4000 && index < 6000;
}

function isGlovePaintkit(index: number): boolean {
  return index >= 10000;
}

export function parseGlovesCfgEntries(content: string): GloveCfgEntry[] {
  const entries: GloveCfgEntry[] = [];
  let gloveDefIndex: number | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const indexMatch = line.match(/"index"\s+"(\d+)"/);
    if (indexMatch) {
      const index = Number(indexMatch[1]);
      if (!Number.isFinite(index) || index <= 0) continue;

      if (isGloveTypeDefIndex(index)) {
        gloveDefIndex = index;
      } else if (isGlovePaintkit(index) && gloveDefIndex !== null) {
        const weaponId = GLOVE_DEFINDEX_TO_WEAPON_ID[gloveDefIndex];
        if (weaponId) {
          entries.push({ weaponId, paintkit: index });
        }
      }
    }
  }

  return entries;
}
