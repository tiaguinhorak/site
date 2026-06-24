export function weaponSupportsStickers(weaponId: string): boolean {
  return !weaponId.includes("glove");
}
