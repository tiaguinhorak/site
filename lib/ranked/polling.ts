import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";
import type { RankedQueueStatusView } from "@/lib/ranked/queue-service";

export const PLAY_ROUTE_PREFIXES = ["/dashboard/ranked", "/dashboard/lobby"] as const;

export type RankedRefreshTier = "full" | "session" | "party" | "rooms";

export function isRankedPlayRoute(pathname: string): boolean {
  return PLAY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isActiveRankedSession(
  session: RankedMatchSessionView | null | undefined,
): boolean {
  return Boolean(session && session.status !== "finished" && session.status !== "cancelled");
}

/** Returns poll interval in ms, or null when polling should be paused. */
export function rankedPollIntervalMs(
  onPlayPage: boolean,
  session: RankedMatchSessionView | null,
  queue: RankedQueueStatusView | null,
  postMatch: RankedMatchSessionView | null,
): number | null {
  if (isActiveRankedSession(session)) {
    if (
      session!.status === "voting" ||
      session!.status === "live" ||
      (session!.status === "starting" && !session!.serverHost)
    ) {
      return 3000;
    }
    return 5000;
  }

  if (postMatch) return 12000;

  if (queue?.searching) return 6000;

  if (!onPlayPage) return null;

  return 25000;
}

export function rankedPollTier(
  onPlayPage: boolean,
  session: RankedMatchSessionView | null,
  queue: RankedQueueStatusView | null,
  postMatch: RankedMatchSessionView | null,
  partyPresent: boolean,
  tick: number,
): RankedRefreshTier {
  if (isActiveRankedSession(session) || queue?.searching || postMatch) {
    return "session";
  }

  if (!onPlayPage) return "session";

  if (!partyPresent) return "rooms";

  // Idle on play page: rotate party-focused vs room list updates.
  return tick % 2 === 0 ? "party" : "rooms";
}
