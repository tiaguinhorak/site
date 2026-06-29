"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import {
  STICKER_SLOT_STORAGE_COUNT,
  isStickerSlotEditable,
} from "@/lib/inventory/weapon-sticker-slot-limits";
import { getSkinStickerLimitState } from "@/lib/inventory/weapon-sticker-support";
import type { InventoryCategoryKey } from "@/lib/profile";
import {
  getStickerWeaponCompatibility,
  type StickerWeaponCompatibilityReason,
} from "@/lib/inventory/sticker-weapon-compatibility";
import { weaponIdToDisplayName } from "@/lib/inventory/weapon-display-name";
import { toast } from "@/lib/toast";

export type PickerSticker = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  compatible?: boolean;
  incompatibleReason?: StickerWeaponCompatibilityReason | null;
  effect?: string | null;
  tournament?: string | null;
  stickerType?: string | null;
};

export const STICKER_SLOT_COUNT = STICKER_SLOT_STORAGE_COUNT;

type SlotDetail = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

type TeamStickerCache = {
  slots: number[];
  slotLabels: string[];
  slotImageUrls: string[];
};

function emptyTeamCache(): TeamStickerCache {
  return {
    slots: Array(STICKER_SLOT_COUNT).fill(0),
    slotLabels: Array(STICKER_SLOT_COUNT).fill(""),
    slotImageUrls: Array(STICKER_SLOT_COUNT).fill(""),
  };
}

function teamCacheFromResponse(
  slots: number[],
  slotDetails: SlotDetail[] | undefined,
): TeamStickerCache {
  const normalized = slots.slice(0, STICKER_SLOT_COUNT);
  while (normalized.length < STICKER_SLOT_COUNT) normalized.push(0);

  const labels = Array(STICKER_SLOT_COUNT).fill("");
  const images = Array(STICKER_SLOT_COUNT).fill("");
  if (Array.isArray(slotDetails)) {
    for (const detail of slotDetails) {
      if (detail.slot < 0 || detail.slot >= STICKER_SLOT_COUNT) continue;
      labels[detail.slot] = detail.name;
      images[detail.slot] = detail.imageUrl ?? "";
    }
  }

  return { slots: normalized, slotLabels: labels, slotImageUrls: images };
}

type UseWeaponStickerStateOptions = {
  mirrorEditsToBoth?: boolean;
  planMaxStickerSlots?: number;
  pickerPageSize?: number;
  categoryKey?: InventoryCategoryKey | null;
};

export function useWeaponStickerState(
  weaponId: string,
  viewTeam: LoadoutTeam,
  enabled: boolean,
  pickerActive = false,
  options?: UseWeaponStickerStateOptions,
) {
  const mirrorEditsToBoth = options?.mirrorEditsToBoth ?? false;
  const planMaxStickerSlots = options?.planMaxStickerSlots ?? STICKER_SLOT_COUNT;
  const pickerPageSize = options?.pickerPageSize ?? 24;
  const categoryKey = options?.categoryKey;
  const stickerLimits = getSkinStickerLimitState(
    weaponId,
    planMaxStickerSlots,
    categoryKey,
  );
  const t = useTranslations("inventory");
  const [byTeam, setByTeam] = useState<Record<LoadoutTeam, TeamStickerCache>>({
    T: emptyTeamCache(),
    CT: emptyTeamCache(),
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerItems, setPickerItems] = useState<PickerSticker[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotalPages, setPickerTotalPages] = useState(1);
  const [pickerTotal, setPickerTotal] = useState(0);
  const loadedWeaponIdRef = useRef("");
  const loadGenerationRef = useRef(0);
  const lastPickerKeyRef = useRef("");

  const display = byTeam[viewTeam];
  const slots = display.slots;
  const slotLabels = display.slotLabels;
  const slotImageUrls = display.slotImageUrls;

  const applyEditToTeams = useCallback(
    (updater: (prev: TeamStickerCache) => TeamStickerCache) => {
      setByTeam((prev) => {
        const nextT = updater(prev.T);
        if (mirrorEditsToBoth) {
          return { T: nextT, CT: { ...nextT } };
        }
        return {
          ...prev,
          [viewTeam]: updater(prev[viewTeam]),
        };
      });
    },
    [mirrorEditsToBoth, viewTeam],
  );

  const loadAllTeams = useCallback(async () => {
    if (!weaponId || !enabled) return;
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    try {
      const teams: LoadoutTeam[] = ["T", "CT"];
      const results = await Promise.all(
        teams.map(async (team) => {
          const params = new URLSearchParams({ weaponId, team });
          const res = await fetch(`/api/inventory/weapon-stickers?${params}`, {
            credentials: "same-origin",
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error ?? t("stickersLoadFailed"));
          }
          return {
            team,
            cache: teamCacheFromResponse(
              (data.slots ?? []) as number[],
              data.slotDetails as SlotDetail[] | undefined,
            ),
          };
        }),
      );

      if (generation !== loadGenerationRef.current) {
        return;
      }

      const next: Record<LoadoutTeam, TeamStickerCache> = {
        T: emptyTeamCache(),
        CT: emptyTeamCache(),
      };
      for (const { team, cache } of results) {
        next[team] = cache;
      }
      setByTeam(next);
    } catch (err) {
      if (generation === loadGenerationRef.current) {
        toast.error(err instanceof Error ? err.message : t("stickersLoadFailed"));
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [weaponId, enabled, t]);

  useEffect(() => {
    if (!enabled) {
      loadedWeaponIdRef.current = "";
      return;
    }

    const weaponChanged = loadedWeaponIdRef.current !== weaponId;
    loadedWeaponIdRef.current = weaponId;

    if (weaponChanged) {
      setByTeam({ T: emptyTeamCache(), CT: emptyTeamCache() });
      setActiveSlot(null);
      setPickerSearch("");
      setPickerItems([]);
      setPickerPage(1);
      setPickerTotalPages(1);
      setPickerTotal(0);
      lastPickerKeyRef.current = "";
    }

    void loadAllTeams();
  }, [enabled, weaponId, loadAllTeams]);

  const loadPicker = useCallback(async (search: string, force = false, page = 1) => {
    if (!weaponId) return;
    const query = search.trim();
    const safePage = Math.max(1, page);
    const key = `${weaponId}:${query}:${safePage}`;
    if (!force && lastPickerKeyRef.current === key) return;
    lastPickerKeyRef.current = key;
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        picker: "1",
        limit: String(pickerPageSize),
        page: String(safePage),
        weaponId,
      });
      if (query) params.set("search", query);
      const res = await fetch(`/api/inventory/weapon-stickers?${params}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      setPickerItems(data.items ?? []);
      setPickerPage(data.page ?? safePage);
      setPickerTotalPages(data.totalPages ?? 1);
      setPickerTotal(data.total ?? 0);
    } catch {
      setPickerItems([]);
      setPickerTotalPages(1);
      setPickerTotal(0);
    } finally {
      setPickerLoading(false);
    }
  }, [weaponId, pickerPageSize]);

  function syncBothTeamsFrom(sourceTeam: LoadoutTeam) {
    setByTeam((prev) => {
      const src = prev[sourceTeam];
      const mirrored: TeamStickerCache = {
        slots: [...src.slots],
        slotLabels: [...src.slotLabels],
        slotImageUrls: [...src.slotImageUrls],
      };
      return { T: mirrored, CT: { ...mirrored } };
    });
  }

  useEffect(() => {
    if (!enabled || !pickerActive) return;
    const timer = setTimeout(() => loadPicker(pickerSearch, false, pickerPage), 300);
    return () => clearTimeout(timer);
  }, [
    pickerActive,
    pickerSearch,
    pickerPage,
    loadPicker,
    enabled,
    weaponId,
  ]);

  const weaponDisplayName = weaponIdToDisplayName(weaponId);

  function stickerIncompatibleMessage(
    reason: StickerWeaponCompatibilityReason | null | undefined,
  ): string {
    if (reason === "legacy_cs2_only") {
      return t("stickersStickerLegacyIncompatible", { weaponName: weaponDisplayName });
    }
    return t("stickersStickerWeaponIncompatible", { weaponName: weaponDisplayName });
  }

  function stickerLockLabel(
    reason: StickerWeaponCompatibilityReason | null | undefined,
  ): string {
    if (reason === "legacy_cs2_only") {
      return t("stickersStickerLegacyLock", { weaponName: weaponDisplayName });
    }
    return t("stickersStickerWeaponLock", { weaponName: weaponDisplayName });
  }

  function isPickerStickerCompatible(item: PickerSticker): boolean {
    if (item.compatible === false) return false;
    const compat = getStickerWeaponCompatibility(
      {
        defIndex: item.defIndex,
        effect: item.effect,
        tournament: item.tournament,
        stickerType: item.stickerType,
      },
      weaponId,
    );
    return compat.compatible;
  }

  function selectSticker(
    defIndex: number,
    name: string,
    slotIndex?: number,
    imageUrl?: string | null,
    incompatibleReason?: StickerWeaponCompatibilityReason | null,
  ) {
    const target = slotIndex ?? activeSlot;
    if (target === null) return;
    if (!isStickerSlotEditable(target, stickerLimits)) return;

    const compat = getStickerWeaponCompatibility({ defIndex }, weaponId);
    if (!compat.compatible) {
      toast.error(
        stickerIncompatibleMessage(incompatibleReason ?? compat.reason),
      );
      return;
    }

    applyEditToTeams((prev) => {
      const nextSlots = [...prev.slots];
      const nextLabels = [...prev.slotLabels];
      const nextImages = [...prev.slotImageUrls];
      nextSlots[target] = defIndex;
      nextLabels[target] = name;
      nextImages[target] = imageUrl ?? "";
      return {
        slots: nextSlots,
        slotLabels: nextLabels,
        slotImageUrls: nextImages,
      };
    });

    setPickerSearch("");
    lastPickerKeyRef.current = "";

    // Advance to next slot (equip flow: 1 → 2 → 3 → 4)
    if (target < stickerLimits.visibleSlotCount - 1) {
      const next = target + 1;
      if (isStickerSlotEditable(next, stickerLimits)) {
        setActiveSlot(next);
      }
    }
  }

  function clearSlot(index: number) {
    if (!isStickerSlotEditable(index, stickerLimits)) return;
    applyEditToTeams((prev) => {
      const nextSlots = [...prev.slots];
      const nextLabels = [...prev.slotLabels];
      const nextImages = [...prev.slotImageUrls];
      nextSlots[index] = 0;
      nextLabels[index] = "";
      nextImages[index] = "";
      return {
        slots: nextSlots,
        slotLabels: nextLabels,
        slotImageUrls: nextImages,
      };
    });
  }

  function getTeamSlots(team: LoadoutTeam): number[] {
    return byTeam[team].slots;
  }

  async function saveWithTeam(
    teamOverride?: LoadoutTeam,
    slotsOverride?: number[],
  ): Promise<boolean> {
    if (loading) {
      return false;
    }

    const teamToSave = teamOverride ?? viewTeam;
    const slotsToSave = (slotsOverride ?? byTeam[teamToSave].slots).slice(
      0,
      STICKER_SLOT_COUNT,
    );
    while (slotsToSave.length < STICKER_SLOT_COUNT) {
      slotsToSave.push(0);
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/weapon-stickers", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-clutchclube-request": "1",
        },
        body: JSON.stringify({ weaponId, team: teamToSave, slots: slotsToSave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("stickersSaveFailed"));
      if (data.gameSyncWarning) {
        toast.error(data.gameSyncWarning);
        return false;
      }
      if (data.gameSync && !data.gameSync.ok) {
        toast.error(data.gameSync.error ?? t("stickersGameSyncFailed"));
        return false;
      }
      if (data.gameSync?.ok) {
        toast.success(t("stickersGameSyncOk"));
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("stickersSaveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save(): Promise<boolean> {
    return saveWithTeam();
  }

  function goToPickerPage(page: number) {
    const next = Math.max(1, Math.min(page, pickerTotalPages));
    void loadPicker(pickerSearch, true, next);
  }

  return {
    slots,
    slotLabels,
    slotImageUrls,
    loading,
    saving,
    activeSlot,
    setActiveSlot,
    selectSticker,
    clearSlot,
    save,
    saveWithTeam,
    getTeamSlots,
    pickerSearch,
    setPickerSearch,
    pickerItems,
    pickerLoading,
    pickerPage,
    pickerTotalPages,
    pickerTotal,
    loadPicker,
    goToPickerPage,
    stickerLimits,
    weaponDisplayName,
    syncBothTeamsFrom,
  };
}
