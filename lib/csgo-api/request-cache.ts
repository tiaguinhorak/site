import "server-only";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

let lastRunAt = 0;
let running: Promise<void> | null = null;

const throttleState = new Map<string, { lastRunAt: number; running: Promise<void> | null }>();

/** Executa no máximo uma vez por intervalo; chamadas extras aguardam ou ignoram. */
export async function throttled(
  key: string,
  intervalMs: number,
  task: () => Promise<void>,
  options?: { wait?: boolean },
): Promise<void> {
  const state = throttleState.get(key) ?? { lastRunAt: 0, running: null };
  const now = Date.now();

  if (state.running) {
    if (options?.wait) await state.running;
    return;
  }

  if (now - state.lastRunAt < intervalMs) {
    return;
  }

  state.lastRunAt = now;
  state.running = task().finally(() => {
    state.running = null;
    throttleState.set(key, state);
  });
  throttleState.set(key, state);
  await state.running;
}
