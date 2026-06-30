import "server-only";

type CountMap = Record<string, number>;

function parseCountMap(raw: unknown): CountMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CountMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[key] = value;
    }
  }
  return out;
}

export function mergeCountMap(existing: unknown, key: string, delta: number): CountMap {
  const map = parseCountMap(existing);
  if (!key.trim() || delta <= 0) return map;
  map[key] = (map[key] ?? 0) + delta;
  return map;
}

export function mergeWeaponKills(existing: unknown, weaponKills: Record<string, number> | undefined): CountMap {
  const map = parseCountMap(existing);
  if (!weaponKills) return map;
  for (const [weapon, kills] of Object.entries(weaponKills)) {
    const k = weapon.trim().toLowerCase();
    const n = Math.max(0, Math.floor(kills));
    if (!k || n <= 0) continue;
    map[k] = (map[k] ?? 0) + n;
  }
  return map;
}

export function topKeyFromCounts(counts: unknown): string | null {
  const map = parseCountMap(counts);
  let best: string | null = null;
  let bestVal = 0;
  for (const [key, value] of Object.entries(map)) {
    if (value > bestVal) {
      bestVal = value;
      best = key;
    }
  }
  return best;
}

export function formatWeaponLabel(weaponKey: string): string {
  const normalized = weaponKey.replace(/^weapon_/, "").replace(/_/g, " ");
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatMapLabel(mapKey: string): string {
  return mapKey
    .replace(/^de_/, "")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function computeAdr(totalDamage: number, roundsPlayed: number): number {
  if (roundsPlayed <= 0) return 0;
  return Math.round((totalDamage / roundsPlayed) * 10) / 10;
}

export function computeHsPct(headshots: number, kills: number): number {
  if (kills <= 0) return 0;
  return Math.round((headshots / kills) * 100);
}
