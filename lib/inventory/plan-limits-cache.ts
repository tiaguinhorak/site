import "server-only";

import { getInventoryPlanLimits, type InventoryPlanLimits } from "@/lib/inventory/plan-inventory-access";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

type Entry = { limits: InventoryPlanLimits; at: number };
const cache = new Map<string, Entry>();

export async function getInventoryPlanLimitsCached(userId: string): Promise<InventoryPlanLimits> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.limits;

  const limits = await getInventoryPlanLimits(userId);
  cache.set(userId, { limits, at: Date.now() });
  return limits;
}

export function invalidatePlanLimitsCache(userId: string): void {
  cache.delete(userId);
}
