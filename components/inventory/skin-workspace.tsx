"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Lock, Search, Settings2, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { SkinRarityBadge } from "@/components/skins/skin-rarity-badge";
import { SkinRarityLine } from "@/components/skins/skin-rarity-line";
import {
  STICKER_SLOT_COUNT,
  useWeaponStickerState,
} from "@/components/inventory/use-weapon-sticker-state";
import type { EquipSide } from "@/lib/inventory/loadout-team";
import {
  weaponAllowedOnTeam,
} from "@/lib/inventory/loadout-team";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { weaponSupportsStickers } from "@/lib/inventory/weapon-stickers";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceInputClass,
  surfaceSubtleClass,
  teamPillClass,
} from "@/lib/ui/theme-surfaces";
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

type SkinWorkspaceProps = {
  open: boolean;
  skin: SkinWorkspaceData | null;
  initialTab?: WorkspaceTab | "preview";
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

function sideLabelForSkin(
  skin: SkinWorkspaceData,
  t: ReturnType<typeof useTranslations<"inventory">>,
): string {
  if (skin.equippedT && skin.equippedCT) return t("teamBoth");
  if (skin.equippedT) return t("teamT");
  if (skin.equippedCT) return t("teamCT");
  return t("workspaceSideNone");
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
  actionLoading,
  onClose,
  onEquip,
  onUnequip,
  onSaved,
}: SkinWorkspaceProps) {
  const t = useTranslations("inventory");
  const [tab, setTab] = useState<WorkspaceTab>("settings");
  const [pendingSide, setPendingSide] = useState<EquipSide>("CT");
  const [stickerTeam, setStickerTeam] = useState<LoadoutTeam>("CT");
  const [savingAll, setSavingAll] = useState(false);

  const canEquipT = skin ? weaponAllowedOnTeam(skin.weaponId, "T") : false;
  const canEquipCT = skin ? weaponAllowedOnTeam(skin.weaponId, "CT") : false;
  const canBoth = canEquipT && canEquipCT;
  const supportsStickers = skin ? weaponSupportsStickers(skin.weaponId) : false;
  const anyEquipped = skin ? skin.equippedT || skin.equippedCT : false;

  const stickerHookEnabled = open && Boolean(skin) && supportsStickers;
  const pickerActive = open && tab === "stickers";

  const stickerState = useWeaponStickerState(
    skin?.weaponId ?? "",
    stickerTeam,
    stickerHookEnabled,
    pickerActive,
  );

  useEffect(() => {
    if (!open || !skin) return;
    const equipT = weaponAllowedOnTeam(skin.weaponId, "T");
    const equipCT = weaponAllowedOnTeam(skin.weaponId, "CT");
    const both = equipT && equipCT;
    const singleOnly = !both && (equipT || equipCT);
    const hasStickers = weaponSupportsStickers(skin.weaponId);
    setTab(resolveInitialTab(initialTab));
    const side = defaultPendingSide(skin, equipT, equipCT);
    setPendingSide(side);
    if (skin.equippedCT) setStickerTeam("CT");
    else if (skin.equippedT) setStickerTeam("T");
    else if (equipT && !equipCT) setStickerTeam("T");
    else if (equipCT && !equipT) setStickerTeam("CT");
    else setStickerTeam("CT");

    if (singleOnly && hasStickers && resolveInitialTab(initialTab) === "settings") {
      setTab("stickers");
    }
  }, [open, initialTab, skin?.catalogSkinId, skin?.equippedCT, skin?.equippedT, skin?.weaponId]);

  useEffect(() => {
    if (!open || !skin) return;
    setPendingSide((prev) => clampPendingSide(prev, canEquipT, canEquipCT));
  }, [open, skin?.weaponId, canEquipT, canEquipCT]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sideDisplay = useMemo(() => {
    if (!skin) return "";
    if (pendingSide === "both" && canBoth) return t("teamBoth");
    if (pendingSide === "T") return t("teamT");
    return t("teamCT");
  }, [skin, pendingSide, canBoth, t]);

  if (!open || !skin) return null;

  async function handleSave() {
    setSavingAll(true);
    try {
      const willEquip = skin!.owned && needsEquipForSide(skin!, pendingSide);

      if (willEquip) {
        await onEquip(pendingSide);
      }

      const stickerTeamForSave: LoadoutTeam =
        pendingSide === "both"
          ? stickerTeam
          : pendingSide === "T"
            ? "T"
            : "CT";

      const shouldSaveStickers =
        supportsStickers && skin!.owned && (anyEquipped || willEquip);

      if (shouldSaveStickers) {
        const ok = await stickerState.saveWithTeam(stickerTeamForSave);
        if (!ok) return;
      }

      toast.success(t("workspaceSaved"));
      onSaved?.();
      onClose();
    } finally {
      setSavingAll(false);
    }
  }

  function openSlot(slotIndex: number) {
    if (!supportsStickers) return;
    setTab("stickers");
    stickerState.setActiveSlot(slotIndex);
    stickerState.setPickerSearch("");
    stickerState.loadPicker("");
  }

  const busy = savingAll || actionLoading || stickerState.saving;

  return (
    <div className="fixed inset-0 z-140 flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/50 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
          aria-label={t("closePreview")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">{t("workspaceTitle")}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left — preview & summary */}
        <aside className="flex shrink-0 flex-col border-b border-border/50 p-4 sm:p-6 lg:w-[42%] lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("workspacePreviewLabel")}
          </p>

          <div className="relative mt-3 overflow-hidden rounded-xl border border-border/50">
            <SkinRarityLine accent={skin.accent} rarity={skin.rarity} />
            <div
              className={cn(
                "relative aspect-[4/3] bg-black/40",
                !skin.imageUrl && "bg-linear-to-br",
                skin.accent,
              )}
            >
              {skin.imageUrl ? (
                <RemoteImage
                  src={skin.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                  className="object-contain p-6 sm:p-8"
                />
              ) : null}
            </div>
            <SkinRarityLine accent={skin.accent} rarity={skin.rarity} position="bottom" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-foreground">{skin.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SkinRarityBadge rarity={skin.rarity} accent={skin.accent} size="md" />
            {skin.category && (
              <span className="text-xs uppercase tracking-wider text-muted">{skin.category}</span>
            )}
          </div>

          {supportsStickers && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("stickersConfigLabel")}
              </p>
              <div className="mt-2 flex gap-2">
                {Array.from({ length: STICKER_SLOT_COUNT }).map((_, index) => {
                  const filled = stickerState.slots[index] > 0;
                  const active = stickerState.activeSlot === index && tab === "stickers";
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => openSlot(index)}
                      className={cn(
                        "flex h-14 w-14 flex-col items-center justify-center rounded-xl border text-xs transition-colors",
                        surfaceSubtleClass,
                        active && "ring-2 ring-primary/50",
                        filled && "border-primary/30",
                      )}
                    >
                      <span className="text-[10px] font-bold text-muted">{index + 1}</span>
                      {filled && stickerState.slotImageUrls[index] ? (
                        <img
                          src={stickerState.slotImageUrls[index]}
                          alt={stickerState.slotLabels[index] || ""}
                          className="h-8 w-8 object-contain"
                        />
                      ) : filled && stickerState.slotLabels[index] ? (
                        <span className="mt-0.5 line-clamp-2 px-1 text-[8px] leading-tight text-foreground">
                          {stickerState.slotLabels[index]}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className={cn("rounded-xl p-3", surfaceSubtleClass)}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {t("workspaceSide")}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {anyEquipped ? sideLabelForSkin(skin, t) : sideDisplay}
              </p>
            </div>
            <div className={cn("rounded-xl p-3", surfaceSubtleClass)}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {t("rarityLegendTitle")}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground line-clamp-2">{skin.rarity}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="mt-6 w-full uppercase tracking-wide"
            disabled={busy || (!skin.owned && !anyEquipped) ? true : undefined}
            onClick={handleSave}
          >
            {busy ? t("workspaceSaving") : t("workspaceSave")}
          </Button>
        </aside>

        {/* Right — tabs */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 gap-2 border-b border-border/50 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setTab("settings")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === "settings"
                  ? "border border-primary/40 bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-foreground"
                  : cn("text-muted", chipInactiveHoverClass),
              )}
            >
              <Settings2 className="h-4 w-4" />
              {t("workspaceSettingsTab")}
            </button>
            {supportsStickers && (
              <button
                type="button"
                onClick={() => setTab("stickers")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  tab === "stickers"
                    ? "border border-primary/40 bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-foreground"
                    : cn("text-muted", chipInactiveHoverClass),
                )}
              >
                <Sticker className="h-4 w-4" />
                {t("workspaceTabStickers")}
              </button>
            )}
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted/40"
            >
              <Lock className="h-4 w-4" />
              {t("workspaceKeychainsTab")}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {tab === "settings" ? (
              <div className="mx-auto max-w-lg">
                {!skin.owned ? (
                  <p className="text-sm text-muted">{t("equipUnavailable")}</p>
                ) : canBoth ? (
                  <>
                    <p className="text-sm text-muted">{t("equipSideHint")}</p>
                    <div className="mt-4 flex flex-col gap-2">
                      {canEquipCT && (
                        <button
                          type="button"
                          onClick={() => setPendingSide("CT")}
                          className={cn(
                            "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                            teamPillClass("CT", pendingSide === "CT"),
                          )}
                        >
                          {t("teamCT")}
                        </button>
                      )}
                      {canEquipT && (
                        <button
                          type="button"
                          onClick={() => setPendingSide("T")}
                          className={cn(
                            "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                            teamPillClass("T", pendingSide === "T"),
                          )}
                        >
                          {t("teamT")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingSide("both")}
                        className={cn(
                          "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                          pendingSide === "both"
                            ? "bg-[linear-gradient(100deg,var(--primary-soft),var(--primary))] text-primary-foreground"
                            : chipInactiveHoverClass,
                        )}
                      >
                        {t("teamBoth")}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {anyEquipped
                      ? canEquipT
                        ? t("equipSideHintT")
                        : t("equipSideHintCT")
                      : t("workspaceEquipHint")}
                  </p>
                )}

                {anyEquipped && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 w-full"
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

                {supportsStickers && skin.owned && canBoth && (
                  <div className="mt-6 border-t border-border/50 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {t("stickersTitle")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canEquipCT && (
                        <button
                          type="button"
                          onClick={() => setStickerTeam("CT")}
                          className={teamPillClass("CT", stickerTeam === "CT")}
                        >
                          {t("teamCT")}
                        </button>
                      )}
                      {canEquipT && (
                        <button
                          type="button"
                          onClick={() => setStickerTeam("T")}
                          className={teamPillClass("T", stickerTeam === "T")}
                        >
                          {t("teamT")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                {!skin.owned ? (
                  <p className="text-sm text-muted">{t("equipUnavailable")}</p>
                ) : stickerState.loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
                  </div>
                ) : (
                  <>
                    <div className="relative">
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
                      <p className="mt-3 text-xs font-medium text-primary">
                        {t("stickersSlotPicker", { slot: stickerState.activeSlot + 1 })}
                      </p>
                    )}

                    {stickerState.pickerLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {stickerState.pickerItems.map((item) => (
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
                              "flex flex-col items-center rounded-xl border border-border/40 p-3 transition-colors",
                              surfaceSubtleClass,
                              chipInactiveHoverClass,
                            )}
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-16 w-16 object-contain"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-lg bg-white/5" />
                            )}
                            <span className="mt-2 line-clamp-2 text-center text-xs text-foreground">
                              {item.name}
                            </span>
                          </button>
                        ))}
                        {stickerState.pickerItems.length === 0 && (
                          <p className="col-span-full py-8 text-center text-sm text-muted">
                            {t("stickersNoResults")}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-4 text-[10px] leading-relaxed text-muted">
                      {t("stickersHint")}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
