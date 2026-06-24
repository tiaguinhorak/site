"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { toast } from "@/lib/toast";

export type PickerSticker = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

export const STICKER_SLOT_COUNT = 5;

type SlotDetail = {
  slot: number;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

export function useWeaponStickerState(
  weaponId: string,
  team: LoadoutTeam,
  enabled: boolean,
  pickerActive = false,
) {
  const t = useTranslations("inventory");
  const [slots, setSlots] = useState<number[]>(Array(STICKER_SLOT_COUNT).fill(0));
  const [slotLabels, setSlotLabels] = useState<string[]>(Array(STICKER_SLOT_COUNT).fill(""));
  const [slotImageUrls, setSlotImageUrls] = useState<string[]>(Array(STICKER_SLOT_COUNT).fill(""));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerItems, setPickerItems] = useState<PickerSticker[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotalPages, setPickerTotalPages] = useState(1);
  const [pickerTotal, setPickerTotal] = useState(0);
  const loadedResourceKeyRef = useRef("");
  const lastPickerKeyRef = useRef("");

  const applySlotDetails = useCallback((details: SlotDetail[]) => {
    const labels = Array(STICKER_SLOT_COUNT).fill("");
    const images = Array(STICKER_SLOT_COUNT).fill("");
    for (const detail of details) {
      if (detail.slot < 0 || detail.slot >= STICKER_SLOT_COUNT) continue;
      labels[detail.slot] = detail.name;
      images[detail.slot] = detail.imageUrl ?? "";
    }
    setSlotLabels(labels);
    setSlotImageUrls(images);
  }, []);

  const loadCurrent = useCallback(async () => {
    if (!weaponId || !enabled) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ weaponId, team });
      const res = await fetch(`/api/inventory/weapon-stickers?${params}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("stickersLoadFailed"));
      const loaded = (data.slots ?? []).slice(0, STICKER_SLOT_COUNT);
      while (loaded.length < STICKER_SLOT_COUNT) loaded.push(0);
      setSlots(loaded);
      if (Array.isArray(data.slotDetails)) {
        applySlotDetails(data.slotDetails as SlotDetail[]);
      } else {
        setSlotLabels(Array(STICKER_SLOT_COUNT).fill(""));
        setSlotImageUrls(Array(STICKER_SLOT_COUNT).fill(""));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("stickersLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [weaponId, team, enabled, t, applySlotDetails]);

  const resourceKey = `${weaponId}:${team}`;

  useEffect(() => {
    if (!enabled) {
      loadedResourceKeyRef.current = "";
      return;
    }
    const resourceChanged = loadedResourceKeyRef.current !== resourceKey;
    loadedResourceKeyRef.current = resourceKey;
    if (resourceChanged) {
      setSlots(Array(STICKER_SLOT_COUNT).fill(0));
      setSlotLabels(Array(STICKER_SLOT_COUNT).fill(""));
      setSlotImageUrls(Array(STICKER_SLOT_COUNT).fill(""));
      setActiveSlot(null);
      setPickerSearch("");
      setPickerItems([]);
      setPickerPage(1);
      setPickerTotalPages(1);
      setPickerTotal(0);
      lastPickerKeyRef.current = "";
    }
    void loadCurrent();
  }, [enabled, resourceKey, loadCurrent]);

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
    setSlots((prev) => {
      const next = [...prev];
      next[target] = defIndex;
      return next;
    });
    setSlotLabels((prev) => {
      const next = [...prev];
      next[target] = name;
      return next;
    });
    setSlotImageUrls((prev) => {
      const next = [...prev];
      next[target] = imageUrl ?? "";
      return next;
    });
    setPickerSearch("");
    lastPickerKeyRef.current = "";
  }

  function clearSlot(index: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = 0;
      return next;
    });
    setSlotLabels((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
    setSlotImageUrls((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
  }

  async function saveWithTeam(
    teamOverride?: LoadoutTeam,
    slotsOverride?: number[],
  ): Promise<boolean> {
    const teamToSave = teamOverride ?? team;
    const slotsToSave = slotsOverride ?? slots;
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
