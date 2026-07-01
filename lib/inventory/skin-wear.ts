import type { CsgoSkinWear } from "@/lib/generated/prisma/client";

/** Standard CS:GO wear tier float boundaries. */
export const WEAR_TIER_BOUNDS: Array<{ wear: CsgoSkinWear; max: number }> = [
  { wear: "factory_new", max: 0.07 },
  { wear: "minimal_wear", max: 0.15 },
  { wear: "field_tested", max: 0.38 },
  { wear: "well_worn", max: 0.45 },
  { wear: "battle_scarred", max: 1.0 },
];

/** Default float for a freshly equipped skin: max quality (Factory New / lowest wear). */
export const DEFAULT_SKIN_FLOAT = 0;

/** Minimum wear sent to the game plugin (0 alone can render as BS — use lowest FN float). */
export const SYNC_SKIN_FLOAT_FACTORY_NEW = 0.001;

/** Paint seed / pattern range accepted from users. */
export const MIN_SKIN_SEED = 0;
export const MAX_SKIN_SEED = 1000;

export function clampSkinFloat(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SKIN_FLOAT;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function clampSkinSeed(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded < MIN_SKIN_SEED) return MIN_SKIN_SEED;
  if (rounded > MAX_SKIN_SEED) return MAX_SKIN_SEED;
  return rounded;
}

/** Derive the discrete wear enum from a continuous float (for display + legacy column). */
export function floatToWearTier(value: number): CsgoSkinWear {
  const clamped = clampSkinFloat(value);
  for (const tier of WEAR_TIER_BOUNDS) {
    if (clamped < tier.max) return tier.wear;
  }
  return "battle_scarred";
}
