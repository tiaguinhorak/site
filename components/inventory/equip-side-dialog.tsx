"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EquipSide } from "@/lib/inventory/loadout-team";
import { weaponSupportsBothTeams } from "@/lib/inventory/loadout-team";
import { cn } from "@/lib/utils";
import { chipInactiveHoverClass, teamPillClass } from "@/lib/ui/theme-surfaces";

type EquipSideDialogProps = {
  open: boolean;
  skinName: string;
  weaponId: string;
  onClose: () => void;
  onConfirm: (side: EquipSide) => void;
  loading?: boolean;
};

export function EquipSideDialog({
  open,
  skinName,
  weaponId,
  onClose,
  onConfirm,
  loading,
}: EquipSideDialogProps) {
  const t = useTranslations("inventory");

  if (!open) return null;

  const canBoth = weaponSupportsBothTeams(weaponId);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 scrim-dim"
        aria-label={t("closePreview")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl glass-modal p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("equipSideTitle")}</h2>
            <p className="mt-1 text-sm text-muted line-clamp-2">{skinName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">{t("equipSideHint")}</p>

        <div className="mt-4 flex flex-col gap-2">
          {(["CT", "T"] as const).map((side) => (
            <Button
              key={side}
              type="button"
              variant="outline"
              className={cn("justify-center", teamPillClass(side, false))}
              disabled={loading}
              onClick={() => onConfirm(side)}
            >
              {side === "T" ? t("teamT") : t("teamCT")}
            </Button>
          ))}
          {canBoth ? (
            <Button
              type="button"
              variant="primary"
              className="justify-center"
              disabled={loading}
              onClick={() => onConfirm("both")}
            >
              {t("teamBoth")}
            </Button>
          ) : (
            <p className="text-center text-xs text-muted">{t("equipBothUnavailable")}</p>
          )}
        </div>

        <Button type="button" variant="ghost" className="mt-4 w-full" onClick={onClose}>
          {t("stickersCancel")}
        </Button>
      </div>
    </div>
  );
}
