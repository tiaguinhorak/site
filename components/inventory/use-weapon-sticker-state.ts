"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { STICKER_SLOT_STORAGE_COUNT } from "@/lib/inventory/weapon-sticker-slot-limits";
import { toast } from "@/lib/toast";

export type PickerSticker = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
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
};

export function useWeaponStickerState(
  weaponId: string,
  viewTeam: LoadoutTeam,
  enabled: boolean,
  pickerActive = false,
  options?: UseWeaponStickerStateOptions,
) {
  const mirrorEditsToBoth = options?.mirrorEditsToBoth ?? false;
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

      const next: Record<LoadoutTeam, TeamStickerCache> = {
        T: emptyTeamCache(),
        CT: emptyTeamCache(),
      };
      for (const { team, cache } of results) {
        next[team] = cache;
      }
      setByTeam(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("stickersLoadFailed"));
    } finally {
      setLoading(false);
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
    const query = search.trim();
    const safePage = Math.max(1, page);
    const key = `${query}:${safePage}`;
    if (!force && lastPickerKeyRef.current === key) return;
    lastPickerKeyRef.current = key;
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        picker: "1",
        limit: "24",
        page: String(safePage),
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
  }, []);

  useEffect(() => {
    if (!enabled || !pickerActive) return;
    lastPickerKeyRef.current = "";
    setPickerPage(1);
    const timer = setTimeout(() => loadPicker(pickerSearch, true, 1), 300);
    return () => clearTimeout(timer);
  }, [pickerActive, pickerSearch, loadPicker, enabled]);

  function selectSticker(
    defIndex: number,
    name: string,
    slotIndex?: number,
    imageUrl?: string | null,
  ) {
    const target = slotIndex ?? activeSlot;
    if (target === null) return;

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
  }

  function clearSlot(index: number) {
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
    const teamToSave = teamOverride ?? viewTeam;
    const slotsToSave = slotsOverride ?? byTeam[teamToSave].slots;
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
      if (data.gameSync && !data.gameSync.ok) {
        toast.error(data.gameSync.error ?? t("stickersGameSyncFailed"));
        return false;
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
  };
}
