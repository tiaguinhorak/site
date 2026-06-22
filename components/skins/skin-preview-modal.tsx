"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";

export type SkinPreviewData = {
  id?: string;
  name: string;
  imageUrl?: string | null;
  accent: string;
  category?: string;
  rarity?: string;
  weaponName?: string;
  paintkitName?: string;
  equipped?: boolean;
  owned?: boolean;
  stattrak?: boolean;
};

type SkinPreviewModalProps = {
  open: boolean;
  skin: SkinPreviewData | null;
  onClose: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  actionLoading?: boolean;
};

export function SkinPreviewModal({
  open,
  skin,
  onClose,
  onEquip,
  onUnequip,
  actionLoading,
}: SkinPreviewModalProps) {
  const t = useTranslations("inventory");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !skin) return null;

  const showEquip = skin.equipped ? onUnequip : onEquip;
  const canAct = skin.owned && showEquip;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="scrim-dim absolute inset-0 cursor-default"
        aria-label={t("closePreview")}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="skin-preview-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-[121] w-full max-w-lg overflow-hidden rounded-2xl glass-modal shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
          aria-label={t("closePreview")}
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={cn("relative aspect-[4/3] bg-black/30", !skin.imageUrl && "bg-linear-to-br", skin.accent)}
        >
          {skin.imageUrl ? (
            <RemoteImage
              src={skin.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 512px"
              priority
              className="object-contain p-6"
            />
          ) : null}
          <span
            className={cn("absolute inset-x-0 bottom-0 h-1.5 bg-linear-to-r", skin.accent)}
            aria-hidden
          />
        </div>

        <div className="p-5 sm:p-6">
          <h2 id="skin-preview-title" className="font-display text-xl font-bold text-foreground">
            {skin.name}
          </h2>
          {(skin.category || skin.rarity) && (
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              {[skin.category, skin.rarity].filter(Boolean).join(" · ")}
            </p>
          )}
          {skin.paintkitName && skin.weaponName && (
            <p className="mt-2 text-sm text-muted">
              {skin.weaponName} — {skin.paintkitName}
            </p>
          )}
          {skin.stattrak && (
            <span className="mt-2 inline-block rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
              StatTrak™
            </span>
          )}

          {canAct && (
            <Button
              type="button"
              variant={skin.equipped ? "outline" : "primary"}
              className="mt-5 w-full"
              disabled={actionLoading ? true : undefined}
              onClick={skin.equipped ? onUnequip : onEquip}
            >
              {actionLoading
                ? skin.equipped
                  ? t("unequipping")
                  : t("equipping")
                : skin.equipped
                  ? t("unequip")
                  : t("equip")}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
