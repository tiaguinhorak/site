import "server-only";

import { getRedis } from "@/lib/redis/client";

const CACHE_PREFIX = "clutch:";

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.set(`${CACHE_PREFIX}${key}`, JSON.stringify(value), {
      EX: Math.max(1, ttlSeconds),
    });
  } catch {
    // Cache write failures are non-fatal.
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch {
    // ignore
  }
}
