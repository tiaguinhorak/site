/**
 * Redis cache helpers for CLI scripts (sync:skins) — no server-only.
 */
import { createClient } from "redis";

const CACHE_PREFIX = "clutch:";

export async function invalidateCatalogRedisKeys(): Promise<void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return;

  const client = createClient({
    url,
    socket: {
      connectTimeout: 4000,
      reconnectStrategy: () => false,
    },
  });

  try {
    await client.connect();
    await client.del(`${CACHE_PREFIX}catalog:ready`, `${CACHE_PREFIX}catalog:total`);
  } catch {
    // Redis optional in local dev
  } finally {
    try {
      if (client.isOpen) await client.disconnect();
    } catch {
      // ignore
    }
  }
}
