"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { validateGifFile, validateBannerGifFile } from "@/lib/client/compress-media";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";

type GifPreviewModalProps = {
  open: boolean;
  file: File | null;
  nickname: string;
  customization: PublicProfileCustomization | null;
  variant?: "avatar" | "banner";
  onClose: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

export function GifPreviewModal({
  open,
  file,
  nickname,
  customization,
  variant = "avatar",
  onClose,
  onConfirm,
}: GifPreviewModalProps) {
  const t = useTranslations("mediaCrop");
  const [mounted, setMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (!open || !file) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const validate =
      variant === "banner" ? validateBannerGifFile : validateGifFile;
    void validate(file).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setPreviewUrl(null);
        return;
      }
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
    });

    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file, variant]);

  const titleKey = variant === "banner" ? "bannerGifTitle" : "gifTitle";
  const descKey = variant === "banner" ? "bannerGifDesc" : "gifDesc";

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
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-6"
      >
        <h3 className="font-display text-lg font-bold text-foreground">{t(titleKey)}</h3>
        <p className="mt-1 text-sm text-muted">{t(descKey)}</p>

        <div className="mt-5 flex flex-col items-center gap-4">
          {error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : previewUrl ? (
            <>
              {variant === "banner" ? (
                <div className="w-full overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt=""
                    className="aspect-[16/5.6] w-full object-cover"
                  />
                </div>
              ) : (
                <UserProfileAvatar
                  avatarUrl={previewUrl}
                  nickname={nickname}
                  animated
                  customization={customization}
                  size="lg"
                />
              )}
              <p className="text-xs text-muted">
                {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
              </p>
            </>
          ) : (
            <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(error) || !file || submitting}
            onClick={async () => {
              if (!file) return;
              setSubmitting(true);
              try {
                await onConfirm(file);
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? t("processing") : t("confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
