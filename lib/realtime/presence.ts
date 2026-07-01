import "server-only";

/**
 * In-memory presence registry. Works because the site runs as a single
 * long-lived Node process (pm2). Each active SSE connection increments a
 * per-user counter; the user is "online" while at least one connection is open.
 */
const connectionCounts = new Map<string, number>();

/** Register a new realtime connection. Returns true if the user just came online. */
export function markOnline(userId: string): boolean {
  const current = connectionCounts.get(userId) ?? 0;
  connectionCounts.set(userId, current + 1);
  return current === 0;
}

/** Deregister a realtime connection. Returns true if the user just went offline. */
export function markOffline(userId: string): boolean {
  const current = connectionCounts.get(userId) ?? 0;
  if (current <= 1) {
    connectionCounts.delete(userId);
    return current === 1;
  }
  connectionCounts.set(userId, current - 1);
  return false;
}

export function isOnline(userId: string): boolean {
  return (connectionCounts.get(userId) ?? 0) > 0;
}

export function filterOnline(userIds: string[]): string[] {
  return userIds.filter((id) => isOnline(id));
}

export function getOnlineUserIds(): string[] {
  return [...connectionCounts.keys()];
}
