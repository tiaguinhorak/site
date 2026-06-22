"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeEvent } from "@/lib/realtime/types";

type Options = {
  enabled?: boolean;
  onEvent: (event: RealtimeEvent) => void;
};

export function useRealtime({ enabled = true, onEvent }: Options) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let disposed = false;
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;

    function connect() {
      if (disposed) return;

      es = new EventSource("/api/realtime/stream");

      es.onopen = () => {
        if (!disposed) setConnected(true);
      };

      es.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data) as RealtimeEvent;
          if (data.type === "ping") return;
          onEventRef.current(data);
        } catch {
          /* ignore malformed payloads */
        }
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        es = null;
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, 4000);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      setConnected(false);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [enabled]);

  return { connected };
}
