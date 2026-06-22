type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Distributed rate limit when REDIS_URL is set; falls back to in-memory. */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const { getRedis } = await import("@/lib/redis/client");
  const redis = await getRedis();
  if (!redis) {
    return checkRateLimit(key, limit, windowMs);
  }

  const redisKey = `rl:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pExpire(redisKey, windowMs);
    }
    const ttl = await redis.pTTL(redisKey);
    if (count > limit) {
      return {
        allowed: false,
        retryAfterMs: ttl > 0 ? ttl : windowMs,
      };
    }
    return { allowed: true, retryAfterMs: 0 };
  } catch {
    return checkRateLimit(key, limit, windowMs);
  }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
