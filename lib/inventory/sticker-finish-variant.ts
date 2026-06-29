/** Sticker finish parsed from catalog name / effect (CS:GO Legacy). */
export type StickerFinishVariant = "gold" | "holo" | "foil" | "glitter" | "normal";

export const STICKER_FINISH_VARIANTS: StickerFinishVariant[] = [
  "gold",
  "holo",
  "foil",
  "glitter",
  "normal",
];

export function parseStickerFinishVariant(
  name: string,
  effect?: string | null,
): StickerFinishVariant {
  const lowerName = name.toLowerCase();
  const lowerEffect = (effect ?? "").toLowerCase();

  if (lowerName.includes("(gold)") || lowerEffect.includes("gold")) return "gold";
  if (lowerName.includes("(holo)") || lowerEffect.includes("holo")) return "holo";
  if (lowerName.includes("(foil)") || lowerEffect.includes("foil")) return "foil";
  if (lowerName.includes("(glitter)") || lowerEffect.includes("glitter")) return "glitter";
  return "normal";
}

export function stickerMatchesFinishFilter(
  name: string,
  effect: string | null | undefined,
  filter: StickerFinishVariant | "",
): boolean {
  if (!filter) return true;
  return parseStickerFinishVariant(name, effect) === filter;
}
