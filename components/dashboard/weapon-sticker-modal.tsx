"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, Sticker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { chipInactiveHoverClass, surfaceInputClass, surfaceSubtleClass } from "@/lib/ui/theme-surfaces";
import { cn } from "@/lib/utils";

type PickerSticker = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
};

type WeaponStickerModalProps = {
  open: boolean;
  weaponId: string;
  weaponName: string;
  team: LoadoutTeam;
  onClose: () => void;
  onSaved?: () => void;
};

const SLOT_COUNT = 5;

export function WeaponStickerModal({
  open,
  weaponId,
  weaponName,
  team,
  onClose,
  onSaved,
}: WeaponStickerModalProps) {
  const t = useTranslations("inventory");
  const [slots, setSlots] = useState<number[]>(Array(SLOT_COUNT).fill(0));
  const [slotLabels, setSlotLabels] = useState<string[]>(Array(SLOT_COUNT).fill(""));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerItems, setPickerItems] = useState<PickerSticker[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const loadCurrent = useCallback(async () => {
    if (!weaponId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ weaponId, team });
      const res = await fetch(`/api/inventory/weapon-stickers?${params}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar stickers.");
      const loaded = (data.slots ?? []).slice(0, SLOT_COUNT);
      while (loaded.length < SLOT_COUNT) loaded.push(0);
      setSlots(loaded);
      setSlotLabels(Array(SLOT_COUNT).fill(""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [weaponId, team]);

  useEffect(() => {
    if (open) {
      loadCurrent();
      setActiveSlot(null);
      setPickerSearch("");
      setPickerItems([]);
    }
  }, [open, loadCurrent]);

  const loadPicker = useCallback(async (search: string) => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({ picker: "1", limit: "40" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/inventory/weapon-stickers?${params}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      setPickerItems(data.items ?? []);
    } catch {
      setPickerItems([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSlot === null) return;
    const timer = setTimeout(() => loadPicker(pickerSearch), 250);
    return () => clearTimeout(timer);
  }, [activeSlot, pickerSearch, loadPicker]);

  function selectSticker(defIndex: number, name: string) {
    if (activeSlot === null) return;
    setSlots((prev) => {
      const next = [...prev];
      next[activeSlot] = defIndex;
      return next;
    });
    setSlotLabels((prev) => {
      const next = [...prev];
      next[activeSlot] = name;
      return next;
    });
    setActiveSlot(null);
    setPickerSearch("");
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
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/weapon-stickers", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-clutchclube-request": "1",
        },
        body: JSON.stringify({ weaponId, team, slots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar.");
      if (data.gameSync && !data.gameSync.ok) {
        throw new Error(
          data.gameSync.error ??
            "Salvo no site, mas falhou ao enviar ao servidor. Respawn no jogo.",
        );
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 scrim-dim"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-card glass-strong p-5 shadow-xl"
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

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {slots.map((defIndex, index) => (
              <div
                key={index}
                className={cn("flex items-center gap-2 rounded-xl p-2", surfaceSubtleClass)}
              >
                <span className="w-8 text-center text-xs font-medium text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {slotLabels[index] || (defIndex > 0 ? `def_index ${defIndex}` : t("stickersEmptySlot"))}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveSlot(index);
                    setPickerSearch("");
                    loadPicker("");
                  }}
                >
                  {t("stickersChoose")}
                </Button>
                {defIndex > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSlot(index)}
                  >
                    {t("stickersClear")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeSlot !== null && (
          <div className={cn("mt-4 rounded-xl border p-3", surfaceSubtleClass)}>
            <p className="text-xs font-medium text-muted">
              {t("stickersSlotPicker", { slot: activeSlot + 1 })}
            </p>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className={cn("w-full rounded-lg py-2 pl-9 pr-3 text-sm", surfaceInputClass)}
                placeholder={t("stickersSearchPlaceholder")}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>
            {pickerLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              </div>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {pickerItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left", chipInactiveHoverClass)}
                      onClick={() => selectSticker(item.defIndex, item.name)}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-white/5" />
                      )}
                      <span className="truncate text-sm">{item.name}</span>
                    </button>
                  </li>
                ))}
                {pickerItems.length === 0 && (
                  <p className="py-2 text-xs text-muted">{t("stickersNoResults")}</p>
                )}
              </ul>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}

        <p className="mt-3 text-[10px] leading-relaxed text-muted">{t("stickersHint")}</p>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("stickersCancel")}
          </Button>
          <Button type="button" disabled={saving || loading} onClick={save}>
            {saving ? t("stickersSaving") : t("stickersSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function weaponSupportsStickers(weaponId: string): boolean {
  return !weaponId.includes("glove");
}

export { weaponSupportsStickers };
