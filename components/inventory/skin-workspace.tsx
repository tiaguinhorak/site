"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Loader2, Lock, Search, SlidersHorizontal, Sticker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import { SkinRarityLine } from "@/components/skins/skin-rarity-line";
import { StickerImage } from "@/components/inventory/sticker-image";
import { TeamEquipBadge } from "@/components/inventory/team-equip-badge";
import {
  useWeaponStickerState,
} from "@/components/inventory/use-weapon-sticker-state";
import type { EquipSide } from "@/lib/inventory/loadout-team";
import { weaponAllowedOnTeam } from "@/lib/inventory/loadout-team";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { getWeaponStickerLimitState, isStickerSlotEditable } from "@/lib/inventory/weapon-sticker-slot-limits";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceInputClass,
  surfaceSubtleClass,
  teamPillClass,
} from "@/lib/ui/theme-surfaces";
import { WeaponStickerSlotGrid } from "@/components/inventory/weapon-sticker-slot-grid";
import { toast } from "@/lib/toast";

export type SkinWorkspaceData = {
  catalogSkinId: string;
  name: string;
  weaponId: string;
  weaponName?: string;
  paintkitName?: string;
  imageUrl: string | null;
  accent: string;
  rarity: string;
  category?: string;
  owned?: boolean;
  equippedT: boolean;
  equippedCT: boolean;
};

type WorkspaceTab = "settings" | "stickers";
type StickerEditScope = LoadoutTeam | "both";

type SkinWorkspaceProps = {
  open: boolean;
  skin: SkinWorkspaceData | null;
  initialTab?: WorkspaceTab | "preview";
  initialStickerTeam?: LoadoutTeam;
  maxStickerSlots?: number;
  canUseStickers?: boolean;
  actionLoading?: boolean;
  onClose: () => void;
  onEquip: (side: EquipSide) => Promise<void> | void;
  onUnequip: (side: EquipSide) => Promise<void> | void;
  onSaved?: () => void;
};

function resolveInitialTab(tab?: WorkspaceTab | "preview"): WorkspaceTab {
  if (tab === "stickers") return "stickers";
  return "settings";
}

function defaultPendingSide(
  skin: SkinWorkspaceData,
  canEquipT: boolean,
  canEquipCT: boolean,
): EquipSide {
  if (skin.equippedT && !skin.equippedCT && canEquipCT) return "CT";
  if (skin.equippedCT && !skin.equippedT && canEquipT) return "T";
  if (canEquipT && canEquipCT) return "both";
  if (canEquipT) return "T";
  return "CT";
}

function clampPendingSide(
  side: EquipSide,
  canEquipT: boolean,
  canEquipCT: boolean,
): EquipSide {
  if (side === "both") {
    return canEquipT && canEquipCT ? "both" : canEquipT ? "T" : "CT";
  }
  if (side === "T" && !canEquipT) return canEquipCT ? "CT" : "T";
  if (side === "CT" && !canEquipCT) return canEquipT ? "T" : "CT";
  return side;
}

function needsEquipForSide(skin: SkinWorkspaceData, side: EquipSide): boolean {
  if (side === "both") return !skin.equippedT || !skin.equippedCT;
  if (side === "T") return !skin.equippedT;
  return !skin.equippedCT;
}

export function SkinWorkspace({
  open,
  skin,
  initialTab = "settings",
  initialStickerTeam,
  maxStickerSlots = 4,
  canUseStickers = true,
  actionLoading,
  onClose,
  onEquip,
  onUnequip,
  onSaved,
}: SkinWorkspaceProps) {
  const t = useTranslations("inventory");
  const [tab, setTab] = useState<WorkspaceTab>("settings");
  const [pendingSide, setPendingSide] = useState<EquipSide>("CT");
  const [stickerScope, setStickerScope] = useState<StickerEditScope>("CT");
  const [savingAll, setSavingAll] = useState(false);

  const stickerViewTeam: LoadoutTeam = stickerScope === "CT" ? "CT" : "T";

  const canEquipT = skin ? weaponAllowedOnTeam(skin.weaponId, "T") : false;
  const canEquipCT = skin ? weaponAllowedOnTeam(skin.weaponId, "CT") : false;
  const canBoth = canEquipT && canEquipCT;
  const supportsStickers = skin ? getWeaponStickerLimitState(skin.weaponId, maxStickerSlots).supportsStickers : false;
  const stickerLimits = skin ? getWeaponStickerLimitState(skin.weaponId, maxStickerSlots) : null;
  const stickersEnabled = supportsStickers && canUseStickers;
  const anyEquipped = skin ? skin.equippedT || skin.equippedCT : false;

  const stickerHookEnabled = open && Boolean(skin) && stickersEnabled;
  const pickerActive = open && tab === "stickers";

  const stickerState = useWeaponStickerState(
    skin?.weaponId ?? "",
    stickerViewTeam,
    stickerHookEnabled,
    pickerActive,
    { mirrorEditsToBoth: stickerScope === "both", planMaxStickerSlots: maxStickerSlots },
  );

  useEffect(() => {
    if (!open || !skin) return;
    const equipT = weaponAllowedOnTeam(skin.weaponId, "T");
    const equipCT = weaponAllowedOnTeam(skin.weaponId, "CT");
    const both = equipT && equipCT;
    const singleOnly = !both && (equipT || equipCT);
    const hasStickers = skin
      ? getWeaponStickerLimitState(skin.weaponId, maxStickerSlots).supportsStickers && stickersEnabled
      : false;
    setTab(resolveInitialTab(initialTab));
    const side = defaultPendingSide(skin, equipT, equipCT);
    setPendingSide(side);
    const nextScope: StickerEditScope =
      initialStickerTeam ??
      (skin.equippedCT
        ? "CT"
        : skin.equippedT
          ? "T"
          : equipT && !equipCT
            ? "T"
            : equipCT && !equipT
              ? "CT"
              : "CT");
    setStickerScope((prev) => (prev === nextScope ? prev : nextScope));

    if (singleOnly && hasStickers && stickersEnabled && resolveInitialTab(initialTab) === "settings") {
      setTab("stickers");
    }
  }, [
    open,
    initialTab,
    initialStickerTeam,
    skin?.catalogSkinId,
    skin?.equippedCT,
    skin?.equippedT,
    skin?.weaponId,
    stickersEnabled,
    maxStickerSlots,
  ]);

  useEffect(() => {
    if (!open || !skin) return;
    setPendingSide((prev) => clampPendingSide(prev, canEquipT, canEquipCT));
  }, [open, skin?.weaponId, canEquipT, canEquipCT]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const pendingSideLabel = useMemo(() => {
    if (pendingSide === "both" && canBoth) return t("teamBoth");
    if (pendingSide === "T") return t("teamT");
    return t("teamCT");
  }, [pendingSide, canBoth, t]);

  if (!open || !skin) return null;

  async function handleSave() {
    setSavingAll(true);
    try {
      const willEquip = skin!.owned && needsEquipForSide(skin!, pendingSide);

      if (willEquip) {
        await onEquip(pendingSide);
      }

      const shouldSaveStickers =
        stickersEnabled && skin!.owned && (anyEquipped || willEquip);

      if (shouldSaveStickers) {
        if (stickerScope === "both" && canBoth) {
          const slotsToSave = stickerState.getTeamSlots("T");
          const okT = await stickerState.saveWithTeam("T", slotsToSave);
          if (!okT) return;
          const okCT = await stickerState.saveWithTeam("CT", slotsToSave);
          if (!okCT) return;
        } else {
          const teamToSave: LoadoutTeam =
            stickerScope === "T" && canEquipT
              ? "T"
              : stickerScope === "CT" && canEquipCT
                ? "CT"
                : canEquipT
                  ? "T"
                  : "CT";
          const ok = await stickerState.saveWithTeam(
            teamToSave,
            stickerState.getTeamSlots(teamToSave),
          );
          if (!ok) return;
        }
      }

      toast.success(t("workspaceSaved"));
      onSaved?.();
      onClose();
    } finally {
      setSavingAll(false);
    }
  }

  function openStickersTab() {
    if (!stickerLimits) return;
    setTab("stickers");
    if (stickerState.activeSlot === null) {
      for (let i = 0; i < stickerLimits.visibleSlotCount; i++) {
        if (isStickerSlotEditable(i, stickerLimits)) {
          stickerState.setActiveSlot(i);
          return;
        }
      }
    }
  }

  function selectStickerSlot(slotIndex: number) {
    if (!stickersEnabled || !skin || !stickerLimits) return;
    if (!isStickerSlotEditable(slotIndex, stickerLimits)) return;
    if (tab !== "stickers") setTab("stickers");
    stickerState.setActiveSlot(slotIndex);
  }

  const activeSlotIndex = stickerState.activeSlot;
  const selectedStickerDefIndex =
    activeSlotIndex !== null ? stickerState.slots[activeSlotIndex] : 0;

  const busy = savingAll || actionLoading || stickerState.saving;

  return (
    <div className="fixed inset-0 z-140 flex flex-col">
      <button
        type="button"
        className="scrim-dim absolute inset-0"
        aria-label={t("closePreview")}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="skin-workspace-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex h-full w-full flex-col overflow-hidden glass-modal"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {t("workspaceBrandLabel")}
            </p>
            <h2
              id="skin-workspace-title"
              className="mt-1 font-display text-lg font-bold leading-tight text-foreground sm:text-2xl"
            >
              {skin.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SkinRarityBadge rarity={skin.rarity} accent={skin.accent} size="md" />
              {skin.category && (
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  {skin.category}
                </span>
              )}
              <TeamEquipBadge equippedT={skin.equippedT} equippedCT={skin.equippedCT} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
            aria-label={t("closePreview")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-2">
          {/* Preview column */}
          <div className="relative flex min-h-0 flex-col border-b border-border/40 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-8 top-8 h-48 rounded-full opacity-35 blur-3xl lg:h-64",
                  "bg-linear-to-r",
                  skin.accent,
                )}
                aria-hidden
              />
              <div className="relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-xl border border-border/50 glass">
                <SkinRarityLine accent={skin.accent} rarity={skin.rarity} />
                <div
                  className={cn(
                    "relative min-h-[200px] flex-1 bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]",
                    !skin.imageUrl && "bg-linear-to-br",
                    !skin.imageUrl && skin.accent,
                  )}
                >
                  {skin.imageUrl ? (
                    <RemoteImage
                      src={skin.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                      className="object-contain p-6 sm:p-10 lg:p-12"
                    />
                  ) : null}
                </div>
                <SkinRarityLine accent={skin.accent} rarity={skin.rarity} position="bottom" />

                {supportsStickers && stickersEnabled && (
                  <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border/40 bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-3 py-3">
                    <WeaponStickerSlotGrid
                      weaponId={skin.weaponId}
                      planMax={maxStickerSlots}
                      slots={stickerState.slots}
                      slotLabels={stickerState.slotLabels}
                      slotImageUrls={stickerState.slotImageUrls}
                      activeSlot={activeSlotIndex}
                      onSelectSlot={selectStickerSlot}
                      onClearSlot={(index) => stickerState.clearSlot(index)}
                      size="sm"
                      showClear
                    />
                  </div>
                )}
              </div>

              {skin.paintkitName && skin.weaponName && (
                <p className="mt-3 text-center text-xs text-muted">
                  {skin.weaponName} · {skin.paintkitName}
                </p>
              )}
            </div>
          </div>

          {/* Controls column */}
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
              <div className="flex rounded-xl border border-border/40 p-1 glass">
                <button
                  type="button"
                  onClick={() => setTab("settings")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                    tab === "settings"
                      ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("workspaceEquipTab")}
                </button>
                {supportsStickers && (
                  <button
                    type="button"
                    onClick={openStickersTab}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                      tab === "stickers"
                        ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-sm"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    <Sticker className="h-4 w-4" />
                    {t("workspaceTabStickers")}
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {tab === "settings" ? (
            <div className="space-y-4">
              {!skin.owned ? (
                <div className={cn("rounded-xl p-4 text-center", surfaceSubtleClass)}>
                  <Lock className="mx-auto h-6 w-6 text-muted" aria-hidden />
                  <p className="mt-2 text-sm text-muted">{t("equipUnavailable")}</p>
                </div>
              ) : canBoth ? (
                <>
                  <p className="text-sm text-muted">{t("equipSideHint")}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {canEquipCT && (
                      <button
                        type="button"
                        onClick={() => setPendingSide("CT")}
                        className={cn(
                          "rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                          teamPillClass("CT", pendingSide === "CT"),
                        )}
                      >
                        CT
                      </button>
                    )}
                    {canEquipT && (
                      <button
                        type="button"
                        onClick={() => setPendingSide("T")}
                        className={cn(
                          "rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                          teamPillClass("T", pendingSide === "T"),
                        )}
                      >
                        TR
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingSide("both")}
                      className={cn(
                        "rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                        pendingSide === "both"
                          ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                          : chipInactiveHoverClass,
                      )}
                    >
                      {t("teamBothShort")}
                    </button>
                  </div>
                </>
              ) : (
                <div className={cn("rounded-xl p-4", surfaceSubtleClass)}>
                  <p className="text-sm text-muted">
                    {anyEquipped
                      ? canEquipT
                        ? t("equipSideHintT")
                        : t("equipSideHintCT")
                      : t("workspaceEquipHint")}
                  </p>
                  {!anyEquipped && (
                    <p className="mt-2 text-xs font-medium text-primary">
                      {pendingSideLabel}
                    </p>
                  )}
                </div>
              )}

              {anyEquipped && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy ? true : undefined}
                  onClick={async () => {
                    const side: EquipSide =
                      skin.equippedT && skin.equippedCT
                        ? "both"
                        : skin.equippedT
                          ? "T"
                          : "CT";
                    await onUnequip(side);
                  }}
                >
                  {busy ? t("unequipping") : t("unequip")}
                </Button>
              )}
            </div>
          ) : (
            <div>
              {!skin.owned ? (
                <div className={cn("rounded-xl p-4 text-center", surfaceSubtleClass)}>
                  <Lock className="mx-auto h-6 w-6 text-muted" aria-hidden />
                  <p className="mt-2 text-sm text-muted">{t("equipUnavailable")}</p>
                </div>
              ) : !canUseStickers ? (
                <div className={cn("rounded-xl p-4", surfaceSubtleClass)}>
                  <p className="text-sm text-muted">{t("stickersPlanRequired")}</p>
                </div>
              ) : stickerState.loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
                </div>
              ) : (
                <>
                  {canBoth && (
                    <div className={cn("rounded-xl p-3", surfaceSubtleClass)}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {t("stickersTeamLabel")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {canEquipT && (
                          <button
                            type="button"
                            onClick={() => setStickerScope("T")}
                            className={teamPillClass("T", stickerScope === "T")}
                          >
                            TR
                          </button>
                        )}
                        {canEquipCT && (
                          <button
                            type="button"
                            onClick={() => setStickerScope("CT")}
                            className={teamPillClass("CT", stickerScope === "CT")}
                          >
                            CT
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setStickerScope("both")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                            stickerScope === "both"
                              ? "bg-primary text-primary-foreground"
                              : chipInactiveHoverClass,
                          )}
                        >
                          {t("teamBothShort")}
                        </button>
                      </div>
                      {stickerScope === "both" && (
                        <p className="mt-2 text-xs text-muted">{t("stickersEditBothHint")}</p>
                      )}
                    </div>
                  )}

                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      className={cn(
                        "w-full rounded-xl py-2.5 pl-10 pr-4 text-sm",
                        surfaceInputClass,
                      )}
                      placeholder={t("stickersSearchPlaceholder")}
                      value={stickerState.pickerSearch}
                      onChange={(e) => stickerState.setPickerSearch(e.target.value)}
                    />
                  </div>

                  {stickerState.activeSlot !== null && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-primary">
                        {t("stickersSlotPicker", { slot: stickerState.activeSlot + 1 })}
                      </p>
                      {stickerState.slots[stickerState.activeSlot] > 0 && (
                        <button
                          type="button"
                          onClick={() => stickerState.clearSlot(stickerState.activeSlot!)}
                          className="text-xs font-medium text-muted underline-offset-2 hover:text-destructive hover:underline"
                        >
                          {t("stickersClear")}
                        </button>
                      )}
                    </div>
                  )}

                  {stickerState.pickerLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {stickerState.pickerItems.map((item) => {
                        const isSelected =
                          item.defIndex > 0 && item.defIndex === selectedStickerDefIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              stickerState.selectSticker(
                                item.defIndex,
                                item.name,
                                stickerState.activeSlot ?? 0,
                                item.imageUrl,
                              )
                            }
                            className={cn(
                              "flex flex-col items-center rounded-xl border-2 p-2 transition-all",
                              surfaceSubtleClass,
                              isSelected
                                ? "border-primary ring-2 ring-primary/35 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
                                : "border-border/30",
                              !isSelected && chipInactiveHoverClass,
                            )}
                            aria-pressed={isSelected}
                          >
                            {item.imageUrl ? (
                              <StickerImage
                                key={item.id}
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-12 w-12 object-contain"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-white/5" />
                            )}
                            <span className="mt-1.5 line-clamp-2 text-center text-[10px] leading-tight text-foreground">
                              {item.name}
                            </span>
                          </button>
                        );
                      })}
                      {stickerState.pickerItems.length === 0 && (
                        <p className="col-span-full py-8 text-center text-sm text-muted">
                          {t("stickersNoResults")}
                        </p>
                      )}
                    </div>
                  )}

                  {stickerState.pickerTotalPages > 1 && !stickerState.pickerLoading && (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={stickerState.pickerPage <= 1}
                        onClick={() =>
                          stickerState.goToPickerPage(stickerState.pickerPage - 1)
                        }
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          chipInactiveHoverClass,
                          stickerState.pickerPage <= 1 && "opacity-40",
                        )}
                      >
                        {t("stickersPagePrev")}
                      </button>
                      <span className="text-xs text-muted">
                        {t("stickersPageLabel", {
                          page: stickerState.pickerPage,
                          total: stickerState.pickerTotalPages,
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={
                          stickerState.pickerPage >= stickerState.pickerTotalPages
                        }
                        onClick={() =>
                          stickerState.goToPickerPage(stickerState.pickerPage + 1)
                        }
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          chipInactiveHoverClass,
                          stickerState.pickerPage >= stickerState.pickerTotalPages &&
                            "opacity-40",
                        )}
                      >
                        {t("stickersPageNext")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
            </div>

            <div className="shrink-0 border-t border-border/40 px-4 py-4 sm:px-6 lg:px-8">
              <Button
                type="button"
                variant="primary"
                className="w-full font-display text-sm uppercase tracking-wider"
                disabled={busy || (!skin.owned && !anyEquipped) ? true : undefined}
                onClick={handleSave}
              >
                {busy ? t("workspaceSaving") : t("workspaceSaveLoadout")}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
