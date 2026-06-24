"use client";

import { useCallback, useRef, useState } from "react";
import { usePollWhenVisible } from "@/lib/hooks/use-poll-when-visible";

export type LiveServerStatView = {
  id: string;
  name: string;
  map: string;
  mode: string;
  host: string;
  port: number;
  players: number;
  slots: number;
  ping: number;
  online: boolean;
  connectCommand: string;
  csgoServerId?: string | null;
  pool?: "ranked" | "warmup" | "public";
};

const POLL_MS = 30_000;

export function useLiveServerStats(
  enabled: boolean,
  pool?: "ranked" | "warmup",
) {
  const [statsByKey, setStatsByKey] = useState<Record<string, LiveServerStatView>>({});
  const [loading, setLoading] = useState(enabled);
  const inflightRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    const query = pool ? `?pool=${pool}` : "";

    try {
      const res = await fetch(`/api/live-servers${query}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        servers: LiveServerStatView[];
      };
      if (controller.signal.aborted) return;

      const next: Record<string, LiveServerStatView> = {};
      for (const server of data.servers) {
        next[`${server.host}:${server.port}`] = server;
      }
      setStatsByKey(next);
    } catch {
      /* aborted or network */
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [enabled, pool]);

  usePollWhenVisible(refresh, enabled ? POLL_MS : 0, enabled);

  return { statsByKey, loading, refresh };
}
