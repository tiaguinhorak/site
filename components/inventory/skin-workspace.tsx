"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Loader2, Lock, Palette, Search, Sticker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import { SkinRarityLine } from "@/components/skins/skin-rarity-line";
import { TeamEquipBadge } from "@/components/inventory/team-equip-badge";
import {
  useWeaponStickerState,
} from "@/components/inventory/use-weapon-sticker-state";
import type { EquipSide } from "@/lib/inventory/loadout-team";
import { weaponAllowedOnTeam } from "@/lib/inventory/loadout-team";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import type { InventoryCategoryKey } from "@/lib/profile";
import { isStickerSlotEditable } from "@/lib/inventory/weapon-sticker-slot-limits";
import {
  getSkinStickerLimitState,
  skinSupportsStickers,
} from "@/lib/inventory/weapon-sticker-support";
import { skinGridImageUrl, skinPreviewImageUrl } from "@/lib/inventory/skin-images";
import {
  prefetchSkinPickerPage,
  readSkinPickerCache,
  writeSkinPickerCache,
} from "@/lib/inventory/skin-picker-cache";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceInputClass,
  surfaceSubtleClass,
} from "@/lib/ui/theme-surfaces";
import { WeaponStickerSlotGrid } from "@/components/inventory/weapon-sticker-slot-grid";
import { StickerPickerTile } from "@/components/inventory/sticker-picker-tile";
import { TeamScopePicker } from "@/components/inventory/team-scope-picker";
import type { StickerFinishVariant } from "@/lib/inventory/sticker-finish-variant";
import { STICKER_FINISH_VARIANTS } from "@/lib/inventory/sticker-finish-variant";
import { toast } from "@/lib/toast";

type WorkspaceTab = "skins" | "stickers";
type StickerEditScope = LoadoutTeam | "both";
type SkinPickerItem = {
  catalogSkinId: string;
  name: string;
  imageUrl: string | null;
  accent: string;
  rarity: string;
  owned: boolean;
  equippedT: boolean;
  equippedCT: boolean;
};

const SKIN_PICKER_PAGE_SIZE = 12;

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
  categoryKey?: InventoryCategoryKey;
  owned?: boolean;
  equippedT: boolean;
  equippedCT: boolean;
};

type SkinWorkspaceProps = {
  open: boolean;
  skin: SkinWorkspaceData | null;
  initialTab?: WorkspaceTab | "preview" | "settings";
  initialStickerTeam?: LoadoutTeam;
  maxStickerSlots?: number;
  canUseStickers?: boolean;
  actionLoading?: boolean;
  onClose: () => void;
  onEquip: (side: EquipSide, catalogSkinId: string) => Promise<void> | void;
  onUnequip: (side: EquipSide) => Promise<void> | void;
  onSaved?: () => void;
  onPreviewSkinChange?: (skin: SkinWorkspaceData) => void;
};

function resolveInitialTab(tab?: WorkspaceTab | "preview" | "settings"): WorkspaceTab {
  if (tab === "stickers") return "stickers";
  return "skins";
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
  initialTab = "skins",
  initialStickerTeam,
  maxStickerSlots = 4,
  canUseStickers = true,
  actionLoading,
  onClose,
  onEquip,
  onUnequip,
  onSaved,
  onPreviewSkinChange,
}: SkinWorkspaceProps) {
  const t = useTranslations("inventory");
  const [tab, setTab] = useState<WorkspaceTab>("skins");
  const [pendingSide, setPendingSide] = useState<EquipSide>("both");
  const [stickerScope, setStickerScope] = useState<StickerEditScope>("both");
  const [lastSingleTeam, setLastSingleTeam] = useState<LoadoutTeam>("CT");
  const [stickerFinishFilter, setStickerFinishFilter] = useState<StickerFinishVariant | "">("");
  const [savingAll, setSavingAll] = useState(false);
  const [activeSkin, setActiveSkin] = useState<SkinWorkspaceData | null>(null);
  const [skinPickerItems, setSkinPickerItems] = useState<SkinPickerItem[]>([]);
  const [skinPickerLoading, setSkinPickerLoading] = useState(false);
  const [skinPickerSearch, setSkinPickerSearch] = useState("");
  const [skinPickerQuery, setSkinPickerQuery] = useState("");
  const [skinPickerPage, setSkinPickerPage] = useState(1);
  const [skinPickerTotalPages, setSkinPickerTotalPages] = useState(1);
  const [stickerLoadEnabled, setStickerLoadEnabled] = useState(false);

  const displaySkin = activeSkin ?? skin;
  const previewImageUrl = useMemo(() => {
    if (!displaySkin?.imageUrl) return null;
    if (tab === "skins") {
      return skinGridImageUrl(displaySkin.imageUrl) ?? displaySkin.imageUrl;
    }
    return skinPreviewImageUrl(displaySkin.imageUrl) ?? displaySkin.imageUrl;
  }, [displaySkin?.imageUrl, tab]);

  const stickerViewTeam: LoadoutTeam =
    stickerScope === "CT"
      ? "CT"
      : stickerScope === "T"
        ? "T"
        : lastSingleTeam;

  const canEquipT = displaySkin ? weaponAllowedOnTeam(displaySkin.weaponId, "T") : false;
  const canEquipCT = displaySkin ? weaponAllowedOnTeam(displaySkin.weaponId, "CT") : false;
  const canBoth = canEquipT && canEquipCT;
  const stickerLimits = displaySkin
    ? getSkinStickerLimitState(
        displaySkin.weaponId,
        maxStickerSlots,
        displaySkin.categoryKey,
      )
    : null;
  const supportsStickers = stickerLimits?.supportsStickers ?? false;
  const stickersEnabled = supportsStickers && canUseStickers;
  const anyEquipped = displaySkin ? displaySkin.equippedT || displaySkin.equippedCT : false;

  const stickerHookEnabled =
    open && Boolean(displaySkin) && stickersEnabled && stickerLoadEnabled;
  const pickerActive = open && tab === "stickers";

  useEffect(() => {
    if (!open) {
      setStickerLoadEnabled(false);
      return;
    }
    if (tab === "stickers") {
      setStickerLoadEnabled(true);
      return;
    }
    if (!stickersEnabled) return;
    const timer = setTimeout(() => setStickerLoadEnabled(true), 500);
    return () => clearTimeout(timer);
  }, [open, tab, stickersEnabled]);

  useEffect(() => {
    if (!open || !displaySkin?.weaponId) return;
    prefetchSkinPickerPage(displaySkin.weaponId, 1, "", SKIN_PICKER_PAGE_SIZE);
  }, [open, displaySkin?.weaponId]);

  const stickerState = useWeaponStickerState(
    displaySkin?.weaponId ?? "",
    stickerViewTeam,
    stickerHookEnabled,
    pickerActive,
    {
      mirrorEditsToBoth: stickerScope === "both",
      planMaxStickerSlots: maxStickerSlots,
      pickerPageSize: 12,
      categoryKey: displaySkin?.categoryKey,
      pickerFinishVariant: stickerFinishFilter,
    },
  );

  useEffect(() => {
    if (skin) setActiveSkin(skin);
  }, [skin?.catalogSkinId, skin]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setSkinPickerQuery(skinPickerSearch), 300);
    return () => clearTimeout(timer);
  }, [open, skinPickerSearch]);

  useEffect(() => {
    if (!open || !displaySkin?.weaponId) {
      return;
    }
    const cached = readSkinPickerCache(
      displaySkin.weaponId,
      skinPickerPage,
      skinPickerQuery,
    );
    if (cached) {
      setSkinPickerItems(cached.items);
      setSkinPickerTotalPages(cached.totalPages);
      setSkinPickerLoading(false);
    } else {
      setSkinPickerLoading(true);
    }

    let cancelled = false;
    const params = new URLSearchParams({
      weaponId: displaySkin.weaponId,
      limit: String(SKIN_PICKER_PAGE_SIZE),
      page: String(skinPickerPage),
      category: "all",
    });
    const query = skinPickerQuery.trim();
    if (query) params.set("search", query);
    void fetch(`/api/inventory/skins?${params}`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.items) return;
        const items = data.items.map(
          (item: {
            id: string;
            name: string;
            imageUrl?: string | null;
            accent: string;
            rarity: string;
            owned: boolean;
            equippedT: boolean;
            equippedCT: boolean;
          }) => ({
            catalogSkinId: item.id,
            name: item.name,
            imageUrl: item.imageUrl ?? null,
            accent: item.accent,
            rarity: item.rarity,
            owned: item.owned,
            equippedT: item.equippedT,
            equippedCT: item.equippedCT,
          }),
        );
        setSkinPickerItems(items);
        setSkinPickerTotalPages(data.totalPages ?? 1);
        writeSkinPickerCache(
          displaySkin.weaponId,
          skinPickerPage,
          skinPickerQuery,
          items,
          data.totalPages ?? 1,
        );
      })
      .finally(() => {
        if (!cancelled) setSkinPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, displaySkin?.weaponId, skinPickerPage, skinPickerQuery]);

  function handleStickerScopeChange(scope: StickerEditScope) {
    if (stickerScope === "T") setLastSingleTeam("T");
    if (stickerScope === "CT") setLastSingleTeam("CT");
    if (scope === "T") setLastSingleTeam("T");
    if (scope === "CT") setLastSingleTeam("CT");
    setStickerScope(scope);
  }

  function selectSkinVariant(item: SkinPickerItem) {
    if (!displaySkin) return;
    const next: SkinWorkspaceData = {
      ...displaySkin,
      catalogSkinId: item.catalogSkinId,
      name: item.name,
      imageUrl: item.imageUrl,
      accent: item.accent,
      rarity: item.rarity,
      owned: item.owned,
      equippedT: item.equippedT,
      equippedCT: item.equippedCT,
    };
    setActiveSkin(next);
    onPreviewSkinChange?.(next);
  }

  useEffect(() => {
    if (!open || !skin) return;
    const equipT = weaponAllowedOnTeam(skin.weaponId, "T");
    const equipCT = weaponAllowedOnTeam(skin.weaponId, "CT");
    const both = equipT && equipCT;
    const singleOnly = !both && (equipT || equipCT);
    const hasStickers = skinSupportsStickers(skin.weaponId, maxStickerSlots, skin.categoryKey) && canUseStickers;
    setTab(resolveInitialTab(initialTab));
    const side = defaultPendingSide(skin, equipT, equipCT);
    setPendingSide(side);
    const nextScope: StickerEditScope =
      initialStickerTeam ??
      (canBoth
        ? "both"
        : skin.equippedCT
          ? "CT"
          : skin.equippedT
            ? "T"
            : equipT
              ? "T"
              : "CT");
    setStickerScope((prev) => (prev === nextScope ? prev : nextScope));
    if (nextScope === "T") setLastSingleTeam("T");
    if (nextScope === "CT") setLastSingleTeam("CT");

    if (singleOnly && hasStickers && stickersEnabled && resolveInitialTab(initialTab) === "skins") {
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
    if (!open || !skin || tab !== "stickers" || !stickersEnabled || !stickerLimits) return;
    if (stickerState.activeSlot !== null) return;
    for (let i = 0; i < stickerLimits.effectiveMaxSlots; i++) {
      if (isStickerSlotEditable(i, stickerLimits)) {
        stickerState.setActiveSlot(i);
        break;
      }
    }
  }, [
    open,
    skin,
    tab,
    stickersEnabled,
    stickerLimits,
    stickerState.activeSlot,
    stickerState.setActiveSlot,
  ]);

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

  if (!open || !displaySkin) return null;

  async function handleSave() {
    setSavingAll(true);
    try {
      const willEquip = displaySkin!.owned && needsEquipForSide(displaySkin!, pendingSide);

      if (willEquip) {
        await onEquip(pendingSide, displaySkin!.catalogSkinId);
      }

      const shouldSaveStickers =
        stickersEnabled && displaySkin!.owned && (anyEquipped || willEquip);

      if (shouldSaveStickers) {
        if (stickerScope === "both" && canBoth) {
          const okT = await stickerState.saveWithTeam(
            "T",
            stickerState.getTeamSlots("T"),
          );
          if (!okT) return;
          const okCT = await stickerState.saveWithTeam(
            "CT",
            stickerState.getTeamSlots("CT"),
          );
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
      for (let i = 0; i < stickerLimits.effectiveMaxSlots; i++) {
        if (isStickerSlotEditable(i, stickerLimits)) {
          stickerState.setActiveSlot(i);
          return;
        }
      }
    }
  }

  function selectStickerSlot(slotIndex: number) {
    if (!stickersEnabled || !displaySkin || !stickerLimits) return;
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
              {displaySkin.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SkinRarityBadge rarity={displaySkin.rarity} accent={displaySkin.accent} size="md" />
              {displaySkin.category && (
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  {displaySkin.category}
                </span>
              )}
              <TeamEquipBadge equippedT={displaySkin.equippedT} equippedCT={displaySkin.equippedCT} />
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

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
          {/* Preview column */}
          <div className="flex min-h-0 flex-col border-b border-border/40 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-6 lg:px-6 lg:py-4">
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-8 top-20 h-32 rounded-full opacity-30 blur-3xl lg:top-24",
                  "bg-linear-to-r",
                  displaySkin.accent,
                )}
                aria-hidden
              />
              <div className="relative mx-auto flex w-full max-w-xl shrink-0 flex-col overflow-hidden rounded-xl border border-border/50 glass">
                <SkinRarityLine accent={displaySkin.accent} rarity={displaySkin.rarity} />
                <div
                  className={cn(
                    "relative aspect-[16/10] min-h-[180px] w-full bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] sm:min-h-[220px] lg:min-h-[260px]",
                    !previewImageUrl && "bg-linear-to-br",
                    !previewImageUrl && displaySkin.accent,
                  )}
                >
                  {previewImageUrl ? (
                    <RemoteImage
                      src={previewImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 90vw, 640px"
                      priority
                      quality={95}
                      unoptimized
                      className="object-contain p-2 sm:p-3"
                    />
                  ) : null}
                </div>
                <SkinRarityLine accent={displaySkin.accent} rarity={displaySkin.rarity} position="bottom" />

                {supportsStickers && stickersEnabled && (
                  <div className="flex shrink-0 justify-center border-t border-border/40 bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-3 py-2">
                    <WeaponStickerSlotGrid
                      weaponId={displaySkin.weaponId}
                      categoryKey={displaySkin.categoryKey}
                      planMax={maxStickerSlots}
                      slots={stickerState.slots}
                      slotLabels={stickerState.slotLabels}
                      slotImageUrls={stickerState.slotImageUrls}
                      activeSlot={activeSlotIndex}
                      onSelectSlot={selectStickerSlot}
                      onClearSlot={(index) => stickerState.clearSlot(index)}
                      size="sm"
                      layout="stack"
                      showClear
                    />
                  </div>
                )}
              </div>

              {displaySkin.paintkitName && displaySkin.weaponName && (
                <p className="shrink-0 text-center text-xs text-muted">
                  {displaySkin.weaponName} · {displaySkin.paintkitName}
                </p>
              )}
            </div>
          </div>

          {/* Controls column */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
              <div className="flex rounded-xl border border-border/40 p-1 glass">
                <button
                  type="button"
                  onClick={() => setTab("skins")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                    tab === "skins"
                      ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  <Palette className="h-4 w-4" />
                  {t("workspaceTabSkins")}
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

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-3 sm:px-6 lg:px-6">
          {tab === "skins" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative shrink-0 pb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className={cn(
                    "w-full rounded-xl py-2 pl-10 pr-3 text-sm",
                    surfaceInputClass,
                  )}
                  placeholder={t("searchPlaceholder")}
                  value={skinPickerSearch}
                  onChange={(e) => {
                    setSkinPickerSearch(e.target.value);
                    setSkinPickerPage(1);
                  }}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {skinPickerLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 pb-2">
                    {skinPickerItems.map((item) => {
                      const selected = item.catalogSkinId === displaySkin.catalogSkinId;
                      const equipped = item.equippedT || item.equippedCT;
                      return (
                        <button
                          key={item.catalogSkinId}
                          type="button"
                          title={item.name}
                          onClick={() => selectSkinVariant(item)}
                          className={cn(
                            "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                            surfaceSubtleClass,
                            selected
                              ? "border-primary ring-2 ring-primary/35"
                              : "border-border/30 hover:border-primary/40",
                            !item.owned && "opacity-55",
                          )}
                          aria-pressed={selected}
                        >
                          {item.imageUrl ? (
                            <RemoteImage
                              src={skinGridImageUrl(item.imageUrl) ?? item.imageUrl}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 25vw, 128px"
                              quality={95}
                              unoptimized
                              className="object-contain p-1"
                            />
                          ) : (
                            <div
                              className={cn(
                                "h-full w-full bg-linear-to-br opacity-40",
                                item.accent,
                              )}
                            />
                          )}
                          {equipped && (
                            <span
                              className="absolute inset-x-0 bottom-0 bg-emerald-500/90 py-px text-[8px] font-bold uppercase text-white"
                              aria-hidden
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {skinPickerItems.length === 0 && (
                      <p className="col-span-full py-6 text-center text-sm text-muted">
                        {t("noResults")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {skinPickerTotalPages > 1 && !skinPickerLoading && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/30 pt-2">
                  <button
                    type="button"
                    disabled={skinPickerPage <= 1}
                    onClick={() => setSkinPickerPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-semibold",
                      chipInactiveHoverClass,
                      skinPickerPage <= 1 && "opacity-40",
                    )}
                  >
                    {t("stickersPagePrev")}
                  </button>
                  <span className="text-xs text-muted">
                    {t("stickersPageLabel", {
                      page: skinPickerPage,
                      total: skinPickerTotalPages,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={skinPickerPage >= skinPickerTotalPages}
                    onClick={() =>
                      setSkinPickerPage((p) => Math.min(skinPickerTotalPages, p + 1))
                    }
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-semibold",
                      chipInactiveHoverClass,
                      skinPickerPage >= skinPickerTotalPages && "opacity-40",
                    )}
                  >
                    {t("stickersPageNext")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {!displaySkin.owned ? (
                <div className={cn("rounded-xl p-4 text-center", surfaceSubtleClass)}>
                  <Lock className="mx-auto h-6 w-6 text-muted" aria-hidden />
                  <p className="mt-2 text-sm text-muted">{t("equipUnavailable")}</p>
                </div>
              ) : !canUseStickers ? (
                <div className={cn("rounded-xl p-4", surfaceSubtleClass)}>
                  <p className="text-sm text-muted">{t("stickersPlanRequired")}</p>
                </div>
              ) : stickerState.loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
                </div>
              ) : (
                <>
                  {(canBoth || canEquipT || canEquipCT) && (
                    <div className="shrink-0 pb-3">
                      <TeamScopePicker
                        value={stickerScope}
                        onChange={handleStickerScopeChange}
                        canT={canEquipT}
                        canCT={canEquipCT}
                        canBoth={canBoth}
                        label={t("stickersTeamLabel")}
                        labels={{
                          t: "TR",
                          ct: "CT",
                          both: t("teamBothShort"),
                        }}
                        hintBoth={t("stickersEditBothHint")}
                      />
                    </div>
                  )}

                  <div className="relative shrink-0 pb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      className={cn(
                        "w-full rounded-xl py-2 pl-10 pr-3 text-sm",
                        surfaceInputClass,
                      )}
                      placeholder={t("stickersSearchPlaceholder")}
                      value={stickerState.pickerSearch}
                      onChange={(e) => stickerState.setPickerSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5 pb-2">
                    <button
                      type="button"
                      onClick={() => setStickerFinishFilter("")}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                        stickerFinishFilter === ""
                          ? "bg-primary text-primary-foreground"
                          : chipInactiveHoverClass,
                      )}
                    >
                      {t("stickersFilterFinishAll")}
                    </button>
                    {STICKER_FINISH_VARIANTS.map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setStickerFinishFilter(variant)}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                          stickerFinishFilter === variant
                            ? "bg-primary text-primary-foreground"
                            : chipInactiveHoverClass,
                        )}
                      >
                        {t(`stickersFilterFinish_${variant}`)}
                      </button>
                    ))}
                  </div>

                  {stickerState.activeSlot !== null && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
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

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {stickerState.pickerLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 pb-2">
                        {stickerState.pickerItems.map((item) => {
                          const isSelected =
                            item.defIndex > 0 &&
                            item.defIndex === selectedStickerDefIndex;
                          return (
                            <StickerPickerTile
                              key={item.id}
                              name={item.name}
                              imageUrl={item.imageUrl}
                              selected={isSelected}
                              compatible
                              sizeClass="max-h-14 max-w-14"
                              onSelect={() =>
                                stickerState.selectSticker(
                                  item.defIndex,
                                  item.name,
                                  stickerState.activeSlot ?? 0,
                                  item.imageUrl,
                                )
                              }
                            />
                          );
                        })}
                        {stickerState.pickerItems.length === 0 && (
                          <p className="col-span-full py-6 text-center text-sm text-muted">
                            {t("stickersNoResults")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {stickerState.pickerTotalPages > 1 && !stickerState.pickerLoading && (
                    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/30 pt-2">
                      <button
                        type="button"
                        disabled={stickerState.pickerPage <= 1}
                        onClick={() =>
                          stickerState.goToPickerPage(stickerState.pickerPage - 1)
                        }
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs font-semibold",
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
                          "rounded-lg px-3 py-2 text-xs font-semibold",
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

            <div className="shrink-0 border-t border-border/40 px-4 py-3 sm:px-6 lg:px-8">
              {!displaySkin.owned ? (
                <p className="mb-3 text-center text-xs text-muted">{t("equipUnavailable")}</p>
              ) : (
                <div className="mb-3 space-y-2">
                  {canBoth ? (
                    <TeamScopePicker
                      value={pendingSide}
                      onChange={setPendingSide}
                      canT={canEquipT}
                      canCT={canEquipCT}
                      canBoth={canBoth}
                      label={t("workspaceSide")}
                      labels={{
                        t: "TR",
                        ct: "CT",
                        both: t("teamBothShort"),
                      }}
                      hintBoth={t("equipSideHint")}
                      size="sm"
                    />
                  ) : (
                    <p className="text-xs text-muted">
                      {anyEquipped
                        ? canEquipT
                          ? t("equipSideHintT")
                          : t("equipSideHintCT")
                        : t("workspaceEquipHint")}
                      {!anyEquipped && (
                        <span className="ml-1 font-medium text-primary">{pendingSideLabel}</span>
                      )}
                    </p>
                  )}
                  {anyEquipped && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy ? true : undefined}
                      onClick={async () => {
                        const side: EquipSide =
                          displaySkin.equippedT && displaySkin.equippedCT
                            ? "both"
                            : displaySkin.equippedT
                              ? "T"
                              : "CT";
                        await onUnequip(side);
                      }}
                    >
                      {busy ? t("unequipping") : t("unequip")}
                    </Button>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="primary"
                className="w-full font-display text-sm uppercase tracking-wider"
                disabled={busy || !displaySkin.owned ? true : undefined}
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
