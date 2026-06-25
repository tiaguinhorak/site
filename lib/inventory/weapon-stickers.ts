import { weaponSupportsStickersById } from "@/lib/inventory/weapon-sticker-slot-limits";

export function weaponSupportsStickers(weaponId: string): boolean {
  return weaponSupportsStickersById(weaponId);
}
