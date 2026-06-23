"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRealtime } from "@/lib/hooks/use-realtime";
import type { RealtimeInvalidateScope, RealtimeEvent } from "@/lib/realtime/types";
import { useUser } from "@/lib/hooks/use-user";

type InvalidateListener = (scope: RealtimeInvalidateScope) => void;

export type MatchLiveEvent = {
  sessionId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  round: number;
  phase: string;
};

type MatchLiveListener = (event: MatchLiveEvent) => void;

type RealtimeContextValue = {
  connected: boolean;
  subscribeInvalidate: (listener: InvalidateListener) => () => void;
  subscribeMatchLive: (listener: MatchLiveListener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const listenersRef = useRef<Set<InvalidateListener>>(new Set());
  const matchLiveListenersRef = useRef<Set<MatchLiveListener>>(new Set());

  const subscribeInvalidate = useCallback((listener: InvalidateListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const subscribeMatchLive = useCallback((listener: MatchLiveListener) => {
    matchLiveListenersRef.current.add(listener);
    return () => matchLiveListenersRef.current.delete(listener);
  }, []);

  const { connected } = useRealtime({
    enabled: Boolean(user),
    onEvent: (event: RealtimeEvent) => {
      if (event.type === "invalidate") {
        for (const listener of listenersRef.current) {
          listener(event.scope);
        }
        return;
      }
      if (event.type === "match_live") {
        const payload: MatchLiveEvent = {
          sessionId: event.sessionId,
          scoreTeamA: event.scoreTeamA,
          scoreTeamB: event.scoreTeamB,
          round: event.round,
          phase: event.phase,
        };
        for (const listener of matchLiveListenersRef.current) {
          listener(payload);
        }
      }
    },
  });

  const value = useMemo(
    () => ({ connected, subscribeInvalidate, subscribeMatchLive }),
    [connected, subscribeInvalidate, subscribeMatchLive],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeInvalidate(listener: InvalidateListener, enabled = true) {
  const ctx = useContext(RealtimeContext);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.subscribeInvalidate((scope) => listenerRef.current(scope));
  }, [ctx, enabled]);
}

export function useRealtimeMatchLive(listener: MatchLiveListener, enabled = true) {
  const ctx = useContext(RealtimeContext);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.subscribeMatchLive((event) => listenerRef.current(event));
  }, [ctx, enabled]);
}

export function useRealtimeStatus() {
  const ctx = useContext(RealtimeContext);
  return { connected: ctx?.connected ?? false };
}
