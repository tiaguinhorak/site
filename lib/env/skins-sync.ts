import "server-only";

export function getSkinsSyncKey(): string | undefined {
  const key = process.env.CSGO_SKINS_SYNC_KEY?.trim();
  return key || undefined;
}

export function isValidSkinsSyncRequest(providedKey: string | null): boolean {
  const expected = getSkinsSyncKey();
  if (!expected) return false;
  return providedKey === expected;
}
