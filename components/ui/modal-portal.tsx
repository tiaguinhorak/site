"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: ReactNode;
  /** Lock page scroll while the modal is mounted. Default true. */
  lockScroll?: boolean;
};

/**
 * Renders modal overlays at document.body so `position: fixed` covers the full
 * viewport. Without a portal, ancestors with transform/filter/overflow clip modals.
 */
export function ModalPortal({ children, lockScroll = true }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lockScroll]);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
