"use client";

import { useEffect, useRef } from "react";

export function usePollWhenVisible(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        await callbackRef.current();
      } catch {
        /* network / aborted */
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), intervalMs);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void tick();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
