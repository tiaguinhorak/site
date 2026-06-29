import { getWeaponStickerClass } from "@/lib/inventory/weapon-sticker-profile";

export type StickerSlotPositionKey =
  | "stock"
  | "body"
  | "scope"
  | "barrel"
  | "slide"
  | "grip"
  | "magazine"
  | "receiver";

const DEFAULT_POSITIONS: StickerSlotPositionKey[] = ["body", "body", "body", "barrel"];

const POSITIONS_BY_CLASS: Record<string, StickerSlotPositionKey[]> = {
  pistol: ["slide", "slide", "grip", "grip"],
  rifle: ["stock", "body", "body", "barrel"],
  smg: ["stock", "body", "magazine", "barrel"],
  shotgun: ["stock", "body", "body", "barrel"],
  sniper: ["stock", "body", "scope", "barrel"],
  heavy: ["stock", "body", "body", "barrel"],
};

export function stickerSlotPositionKeys(
  weaponId: string,
  slotCount: number,
): StickerSlotPositionKey[] {
  const classKey = getWeaponStickerClass(weaponId);
  const template =
    classKey === "melee" || classKey === "other"
      ? DEFAULT_POSITIONS
      : POSITIONS_BY_CLASS[classKey] ?? DEFAULT_POSITIONS;

  return Array.from({ length: slotCount }, (_, index) => template[index] ?? "body");
}
