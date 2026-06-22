import "server-only";

import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export async function getRedis(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      const next = createClient({
        url,
        socket: {
          connectTimeout: 4000,
          reconnectStrategy: (retries) => (retries > 2 ? false : retries * 200),
        },
      });
      next.on("error", () => {
        // Avoid crashing the Node process on transient Redis errors.
      });
      await next.connect();
      client = next;
      return next;
    } catch {
      client = null;
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}
