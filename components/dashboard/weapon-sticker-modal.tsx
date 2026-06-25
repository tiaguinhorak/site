"use client";

import { useTranslations } from "next-intl";
import { Sticker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { WeaponStickerEditor } from "@/components/inventory/weapon-sticker-editor";

type WeaponStickerModalProps = {
  open: boolean;
  weaponId: string;
  weaponName: string;
  team: LoadoutTeam;
  onClose: () => void;
  onSaved?: () => void;
};

export function WeaponStickerModal({
  open,
  weaponId,
  weaponName,
  team,
  onClose,
  onSaved,
}: WeaponStickerModalProps) {
  const t = useTranslations("inventory");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 scrim-dim"
        aria-label={t("closePreview")}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-2xl rounded-card glass-strong p-5 shadow-xl sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sticker className="h-5 w-5 text-primary" />
              {t("stickersTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {weaponName} · {team === "T" ? t("teamT") : t("teamCT")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <WeaponStickerEditor
          weaponId={weaponId}
          team={team}
          onSaved={() => {
            onSaved?.();
            onClose();
          }}
        />

        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("stickersCancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { weaponSupportsStickers } from "@/lib/inventory/weapon-stickers";
