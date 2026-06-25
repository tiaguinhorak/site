import { weaponSupportsStickersById } from "@/lib/inventory/weapon-sticker-slot-limits";

export type StickerCompatibilityInput = {
  defIndex: number;
  effect?: string | null;
  tournament?: string | null;
  stickerType?: string | null;
};

export type StickerWeaponCompatibilityReason =
  | "compatible"
  | "weapon_unsupported"
  | "legacy_cs2_only";

export type StickerWeaponCompatibility = {
  compatible: boolean;
  reason: StickerWeaponCompatibilityReason;
};

/**
 * Last sticker def_index shipped with CS:GO Legacy assets (pre–Austin 2025 / CS2 majors).
 * Stickers above this ID do not render reliably on legacy servers.
 */
export const LEGACY_MAX_STICKER_DEFINDEX = 8553;

const LEGACY_BLOCKED_EFFECTS = new Set(["Lenticular", "Embroidered"]);

const LEGACY_BLOCKED_TOURNAMENT_PATTERNS = [
  /austin 2025/i,
  /budapest 2025/i,
  /cs2 major/i,
];

export function isLegacyCompatibleSticker(meta: StickerCompatibilityInput): boolean {
  if (meta.defIndex <= 0) return true;
  if (meta.defIndex > LEGACY_MAX_STICKER_DEFINDEX) return false;
  if (meta.effect && LEGACY_BLOCKED_EFFECTS.has(meta.effect)) return false;
  if (meta.tournament) {
    for (const pattern of LEGACY_BLOCKED_TOURNAMENT_PATTERNS) {
      if (pattern.test(meta.tournament)) return false;
    }
  }
  return true;
}

/** CS2-only stickers — hidden from picker and cannot be saved on legacy servers. */
export function isCs2OnlySticker(meta: StickerCompatibilityInput): boolean {
  return !isLegacyCompatibleSticker(meta);
}

export function stickerCompatibilityMeta(
  row: StickerCompatibilityInput,
): StickerCompatibilityInput {
  return {
    defIndex: row.defIndex,
    effect: row.effect ?? null,
    tournament: row.tournament ?? null,
    stickerType: row.stickerType ?? null,
  };
}

export function getStickerWeaponCompatibility(
  meta: StickerCompatibilityInput,
  weaponId: string,
): StickerWeaponCompatibility {
  if (!weaponSupportsStickersById(weaponId)) {
    return { compatible: false, reason: "weapon_unsupported" };
  }
  if (!isLegacyCompatibleSticker(meta)) {
    return { compatible: false, reason: "legacy_cs2_only" };
  }
  return { compatible: true, reason: "compatible" };
}
