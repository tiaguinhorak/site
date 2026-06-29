import type { EquippedLoadoutEntry } from "@/components/inventory/equipped-loadout-grid";

export type ClientLoadoutResponse = {
  steamLinked: boolean;
  steamId: string | null;
  steamId2?: string | null;
  items: EquippedLoadoutEntry[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const STORAGE_KEY = "cc:loadout:v1";

let memory: { data: ClientLoadoutResponse; at: number } | null = null;

function isFresh(at: number): boolean {
  return Date.now() - at < CACHE_TTL_MS;
}

function readStorage(): { data: ClientLoadoutResponse; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: ClientLoadoutResponse; at: number };
    if (!parsed?.data || !isFresh(parsed.at)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(data: ClientLoadoutResponse, at: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data, at }));
  } catch {
    // ignore
  }
}

export function readLoadoutClientCache(): ClientLoadoutResponse | null {
  if (memory && isFresh(memory.at)) return memory.data;

  const stored = readStorage();
  if (stored) {
    memory = stored;
    return stored.data;
  }
  return null;
}

export function writeLoadoutClientCache(data: ClientLoadoutResponse): void {
  const at = Date.now();
  memory = { data, at };
  writeStorage(data, at);
}

export function patchLoadoutClientCache(items: EquippedLoadoutEntry[]): void {
  if (!memory) return;
  memory = {
    data: { ...memory.data, items },
    at: memory.at,
  };
  writeStorage(memory.data, memory.at);
}
