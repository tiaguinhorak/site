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
type EventListener = (event: RealtimeEvent) => void;

type RealtimeContextValue = {
  connected: boolean;
  subscribeInvalidate: (listener: InvalidateListener) => () => void;
  subscribeMatchLive: (listener: MatchLiveListener) => () => void;
  subscribeEvents: (listener: EventListener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const listenersRef = useRef<Set<InvalidateListener>>(new Set());
  const matchLiveListenersRef = useRef<Set<MatchLiveListener>>(new Set());
  const eventListenersRef = useRef<Set<EventListener>>(new Set());

  const subscribeInvalidate = useCallback((listener: InvalidateListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const subscribeMatchLive = useCallback((listener: MatchLiveListener) => {
    matchLiveListenersRef.current.add(listener);
    return () => matchLiveListenersRef.current.delete(listener);
  }, []);

  const subscribeEvents = useCallback((listener: EventListener) => {
    eventListenersRef.current.add(listener);
    return () => eventListenersRef.current.delete(listener);
  }, []);

  const { connected } = useRealtime({
    enabled: Boolean(user),
    onEvent: (event: RealtimeEvent) => {
      for (const listener of eventListenersRef.current) {
        listener(event);
      }
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
    () => ({ connected, subscribeInvalidate, subscribeMatchLive, subscribeEvents }),
    [connected, subscribeInvalidate, subscribeMatchLive, subscribeEvents],
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

export function useRealtimeEvents(listener: EventListener, enabled = true) {
  const ctx = useContext(RealtimeContext);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.subscribeEvents((event) => listenerRef.current(event));
  }, [ctx, enabled]);
}

export function useRealtimeStatus() {
  const ctx = useContext(RealtimeContext);
  return { connected: ctx?.connected ?? false };
}
