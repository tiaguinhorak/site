"use client";

import { useEffect, useRef, useState } from "react";

type UseLazyMediaOptions = {
  /** Skip observation and treat as always visible (profile header, etc.). */
  priority?: boolean;
  rootMargin?: string;
};

export function useLazyMedia(options: UseLazyMediaOptions = {}) {
  const { priority = false, rootMargin = "120px" } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    if (priority) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [priority, rootMargin]);

  return { ref, visible };
}

export function isAnimatedGifUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".gif");
}
