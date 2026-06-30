"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { StickerImage } from "@/components/inventory/sticker-image";
import { RemoteImage } from "@/components/ui/remote-image";
import {
  SkinPreviewModal,
  type SkinPreviewData,
} from "@/components/skins/skin-preview-modal";

export type StoreRewardPreviewTarget =
  | { type: "skin"; data: SkinPreviewData }
  | {
      type: "agent";
      label: string;
      imageUrl: string | null;
      subLabel?: string | null;
    }
  | { type: "sticker"; label: string; imageUrl: string | null };

export function storeRewardItemToPreviewTarget(reward: {
  kind: string;
  catalogSkinId?: string | null;
  label: string | null;
  imageUrl: string | null;
  subLabel: string | null;
  toSkinPreview: (reward: {
    kind: string;
    catalogSkinId?: string | null;
    label: string | null;
    imageUrl: string | null;
    subLabel: string | null;
  }) => SkinPreviewData | null;
}): StoreRewardPreviewTarget | null {
  if (reward.kind === "CATALOG_SKIN" && reward.catalogSkinId) {
    const skin = reward.toSkinPreview(reward);
    return skin ? { type: "skin", data: skin } : null;
  }
  if (reward.kind === "AGENT") {
    return {
      type: "agent",
      label: reward.label ?? "Agente",
      imageUrl: reward.imageUrl,
      subLabel: reward.subLabel,
    };
  }
  if (reward.kind === "STICKER") {
    return {
      type: "sticker",
      label: reward.label ?? "Sticker",
      imageUrl: reward.imageUrl,
    };
  }
  return null;
}

export function StoreRewardPreviewModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: StoreRewardPreviewTarget | null;
  onClose: () => void;
}) {
  const t = useTranslations("store");

  if (target?.type === "skin") {
    return <SkinPreviewModal open={open} skin={target.data} onClose={onClose} />;
  }

  if (!open || !target) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal
        aria-label={target.label}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-black/20 hover:text-foreground"
          onClick={onClose}
          aria-label={t("closePreview")}
        >
          ✕
        </button>

        {target.type === "agent" ? (
          target.imageUrl ? (
            <RemoteImage
              src={target.imageUrl}
              alt={target.label}
              width={240}
              height={320}
              className="mx-auto h-64 w-48 rounded-xl object-cover object-top"
            />
          ) : (
            <div className="mx-auto flex h-64 w-48 items-center justify-center rounded-xl bg-black/30">
              <UserRound className="h-16 w-16 text-muted" />
            </div>
          )
        ) : (
          <div className="mx-auto flex h-52 w-full max-w-[220px] items-center justify-center rounded-xl bg-black/30 p-4">
            <StickerImage
              src={target.imageUrl}
              alt={target.label}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        <p className="mt-4 text-center font-display text-lg font-bold leading-snug">
          {target.label}
        </p>
        {target.type === "agent" && target.subLabel ? (
          <p className="mt-1 text-center text-sm capitalize text-muted">{target.subLabel}</p>
        ) : null}
        {target.type === "sticker" ? (
          <p className="mt-1 text-center text-sm text-muted">{t("stickerPreviewHint")}</p>
        ) : null}
      </div>
    </div>
  );
}
