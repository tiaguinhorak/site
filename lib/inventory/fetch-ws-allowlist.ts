import "server-only";

import { getCsgoApiBaseUrl, csgoBackendAuthHeaders } from "@/lib/csgo-api/config";

let cachedKeys: Set<string> | null = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function fetchWsAllowlistKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_MS) {
    return cachedKeys;
  }

  const url = `${getCsgoApiBaseUrl()}/api/csgo/skins/ws-allowlist`;
  try {
    const res = await fetch(url, {
      headers: { ...csgoBackendAuthHeaders() },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[catalog] ws-allowlist HTTP", res.status);
      return cachedKeys ?? new Set();
    }
    const data = (await res.json()) as { keys?: string[] };
    const keys = new Set(Array.isArray(data.keys) ? data.keys : []);
    cachedKeys = keys;
    cachedAt = now;
    return keys;
  } catch (err) {
    console.warn("[catalog] ws-allowlist fetch failed:", err);
    return cachedKeys ?? new Set();
  }
}

export function wsCatalogKey(weaponId: string, paintkit: number): string {
  return `${weaponId}:${paintkit}`;
}

export function isInWsAllowlist(
  weaponId: string,
  paintkit: number,
  allowlist: Set<string>,
): boolean {
  if (allowlist.size === 0) return true;
  return allowlist.has(wsCatalogKey(weaponId, paintkit));
}
