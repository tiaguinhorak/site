"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Move, RotateCcw, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  type CropAspect,
  type CropTransform,
  applyZoomAroundCenter,
  exportCroppedBlob,
  getCropAspectRatio,
  getInitialCropTransform,
  loadImageFromFile,
  loadImageFromUrl,
  validateImageFileType,
} from "@/lib/client/compress-media";
import { cn } from "@/lib/utils";

export type ImageCropSource =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

type ImageCropModalProps = {
  open: boolean;
  source: ImageCropSource | null;
  aspect: CropAspect;
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm: (blob: Blob, previewUrl: string) => void | Promise<void>;
};

const VIEWPORT_WIDTH = 560;

export function ImageCropModal({
  open,
  source,
  aspect,
  title,
  description,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const t = useTranslations("mediaCrop");
  const viewportHeight = Math.round(VIEWPORT_WIDTH / getCropAspectRatio(aspect));
  const [mounted, setMounted] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<CropTransform | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const prevZoomRef = useRef(1);
  const initialTransformRef = useRef<CropTransform | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !source) {
      setImage(null);
      setTransform(null);
      setZoom(1);
      prevZoomRef.current = 1;
      initialTransformRef.current = null;
      return;
    }

    if (source.kind === "file" && !validateImageFileType(source.file)) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loader =
      source.kind === "file"
        ? loadImageFromFile(source.file)
        : loadImageFromUrl(source.url);

    void loader
      .then((loaded) => {
        if (cancelled) return;
        const initial = getInitialCropTransform(
          loaded.naturalWidth,
          loaded.naturalHeight,
          VIEWPORT_WIDTH,
          viewportHeight,
        );
        setImage(loaded);
        setTransform(initial);
        initialTransformRef.current = initial;
        setZoom(1);
        prevZoomRef.current = 1;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, source, viewportHeight]);

  useEffect(() => {
    if (!image || !transform) return;
    if (zoom === prevZoomRef.current) return;
    setTransform((prev) =>
      prev
        ? applyZoomAroundCenter(
            prev,
            image,
            VIEWPORT_WIDTH,
            viewportHeight,
            prevZoomRef.current,
            zoom,
          )
        : prev,
    );
    prevZoomRef.current = zoom;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoom-driven offset only
  }, [zoom, image, viewportHeight]);

  const renderTransform = useMemo((): CropTransform | null => {
    if (!transform) return null;
    return {
      scale: transform.scale * zoom,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    };
  }, [transform, zoom]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!transform) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        ox: transform.offsetX,
        oy: transform.offsetY,
      };
    },
    [transform],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setTransform((prev) =>
      prev
        ? {
            ...prev,
            offsetX: drag.ox + (event.clientX - drag.x),
            offsetY: drag.oy + (event.clientY - drag.y),
          }
        : prev,
    );
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((prev) => Math.min(3, Math.max(0.6, prev - event.deltaY * 0.0015)));
  }, []);

  function handleReset() {
    if (!initialTransformRef.current) return;
    setTransform(initialTransformRef.current);
    setZoom(1);
    prevZoomRef.current = 1;
  }

  async function handleConfirm() {
    if (!image || !renderTransform) return;
    setSubmitting(true);
    try {
      const blob = await exportCroppedBlob(
        image,
        aspect,
        renderTransform,
        VIEWPORT_WIDTH,
        viewportHeight,
      );
      const previewUrl = URL.createObjectURL(blob);
      await onConfirm(blob, previewUrl);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-background/85 backdrop-blur-md"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-xl border-2 border-primary/30 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] shadow-inner"
            style={{
              width: "100%",
              maxWidth: VIEWPORT_WIDTH,
              height: viewportHeight,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
              </div>
            ) : image && renderTransform ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{
                  width: image.naturalWidth * renderTransform.scale,
                  height: image.naturalHeight * renderTransform.scale,
                  transform: `translate(${renderTransform.offsetX}px, ${renderTransform.offsetY}px)`,
                }}
              />
            ) : null}

            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                backgroundImage: `
                  linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.12) calc(33.33% - 0.5px), rgba(255,255,255,0.12) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.12) calc(66.66% - 0.5px), rgba(255,255,255,0.12) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)),
                  linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.12) calc(33.33% - 0.5px), rgba(255,255,255,0.12) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.12) calc(66.66% - 0.5px), rgba(255,255,255,0.12) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))
                `,
              }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted" />
            <input
              type="range"
              min={0.6}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="min-w-0 flex-1"
            />
            <span className="w-12 shrink-0 text-right text-xs text-muted">{zoom.toFixed(1)}×</span>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("reset")}
            </Button>
          </div>

          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Move className="h-3.5 w-3.5 shrink-0" />
            {t("dragHint")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleConfirm()}
            disabled={loading || submitting || !image || !renderTransform}
          >
            {submitting ? t("processing") : t("confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
