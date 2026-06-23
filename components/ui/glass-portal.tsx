"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type GlassPortalProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  align?: "left" | "right";
  width?: number;
  offset?: number;
  children: ReactNode;
  panelClassName?: string;
  scrimLabel?: string;
};

export function GlassPortal({
  open,
  onClose,
  triggerRef,
  align = "right",
  width = 280,
  offset = 8,
  children,
  panelClassName = "",
  scrimLabel,
}: GlassPortalProps) {
  const tCommon = useTranslations("common");
  const closeLabel = scrimLabel ?? tCommon("close");
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxWidth = Math.min(width, window.innerWidth - 16);

    setStyle({
      position: "fixed",
      top: rect.bottom + offset,
      width: maxWidth,
      ...(align === "right"
        ? { right: Math.max(8, window.innerWidth - rect.right) }
        : { left: Math.max(8, rect.left) }),
    });
  }, [align, offset, triggerRef, width]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="scrim-dismiss fixed inset-0 z-[80]"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        className={`glass-menu fixed z-[90] overflow-visible rounded-2xl shadow-2xl ${panelClassName}`}
        style={style}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
