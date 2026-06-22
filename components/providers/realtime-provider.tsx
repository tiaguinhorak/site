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
import type { RealtimeInvalidateScope } from "@/lib/realtime/types";
import { useUser } from "@/lib/hooks/use-user";

type InvalidateListener = (scope: RealtimeInvalidateScope) => void;

type RealtimeContextValue = {
  connected: boolean;
  subscribeInvalidate: (listener: InvalidateListener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const listenersRef = useRef<Set<InvalidateListener>>(new Set());

  const subscribeInvalidate = useCallback((listener: InvalidateListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const { connected } = useRealtime({
    enabled: Boolean(user),
    onEvent: (event) => {
      if (event.type !== "invalidate") return;
      for (const listener of listenersRef.current) {
        listener(event.scope);
      }
    },
  });

  const value = useMemo(
    () => ({ connected, subscribeInvalidate }),
    [connected, subscribeInvalidate],
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

export function useRealtimeStatus() {
  const ctx = useContext(RealtimeContext);
  return { connected: ctx?.connected ?? false };
}
