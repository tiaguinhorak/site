/**
 * !ws allowlist — api-csgo when available, kgns GitHub configs as fallback.
 */

import {
  fetchWsAllowlistKeysFromGithub,
  wsConfigEntriesToKeys,
  type WsConfigEntry,
} from "@/lib/inventory/parse-ws-config";

let cachedKeys: Set<string> | null = null;
let cachedAt = 0;
let cachedSource = "none";
const CACHE_MS = 5 * 60 * 1000;

function wsLang(): string {
  return process.env.WS_WEAPONS_LANG?.trim() || "english";
}

function csgoApiBaseUrl(): string {
  const raw = process.env.CSGO_API_URL?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CSGO_API_URL must be set in production.");
    }
    return "http://127.0.0.1:3000";
  }
  return raw.replace(/\/$/, "");
}

function csgoApiAuthHeaders(): Record<string, string> {
  const key = process.env.CSGO_API_KEY ?? process.env.API_KEY?.trim();
  return key ? { "x-api-key": key } : {};
}

function keysFromApiEntries(entries: WsConfigEntry[]): Set<string> {
  return wsConfigEntriesToKeys(entries);
}

export async function fetchWsAllowlistKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_MS) {
    return cachedKeys;
  }

  const url = `${csgoApiBaseUrl()}/api/csgo/skins/ws-allowlist`;
  try {
    const res = await fetch(url, {
      headers: { ...csgoApiAuthHeaders() },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        keys?: string[];
        entries?: Array<{ weaponId: string; paintkit: number }>;
      };
      if (Array.isArray(data.keys) && data.keys.length > 0) {
        cachedKeys = new Set(data.keys);
        cachedSource = "api";
        cachedAt = now;
        return cachedKeys;
      }
      if (Array.isArray(data.entries) && data.entries.length > 0) {
        cachedKeys = keysFromApiEntries(data.entries);
        cachedSource = "api";
        cachedAt = now;
        return cachedKeys;
      }
    } else {
      console.warn("[catalog] ws-allowlist API", res.status, "— using kgns GitHub fallback");
    }
  } catch (err) {
    console.warn("[catalog] ws-allowlist API failed — using kgns GitHub fallback:", err);
  }

  try {
    cachedKeys = await fetchWsAllowlistKeysFromGithub(wsLang());
    cachedSource = "github";
    cachedAt = now;
    console.log(`[catalog] ws-allowlist from kgns GitHub (${cachedKeys.size} keys)`);
    return cachedKeys;
  } catch (err) {
    console.warn("[catalog] ws-allowlist GitHub fallback failed:", err);
    return cachedKeys ?? new Set();
  }
}

export function getWsAllowlistSource(): string {
  return cachedSource;
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
