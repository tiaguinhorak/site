"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/admin/pickers/map-picker";
import { secureApi } from "@/lib/api/client";
import {
  DEFAULT_LOBBY_SETTINGS,
  LOBBY_REGION_OPTIONS,
  LOBBY_SLOT_OPTIONS,
  LOBBY_WEAPON_OPTIONS,
  type LobbyRoomSettings,
} from "@/lib/lobby/schemas";
import type { LobbyRoomEnriched } from "@/lib/lobby";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type GameModeOption = {
  id: string;
  slug: string;
  name: string;
  accent: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (room: LobbyRoomEnriched) => void;
};

const WEAPON_LABEL_KEYS: Record<(typeof LOBBY_WEAPON_OPTIONS)[number], string> = {
  all: "weaponAll",
  pistols: "weaponPistols",
  smg: "weaponSmg",
  rifles: "weaponRifles",
  snipers: "weaponSnipers",
};

export function CreateLobbyModal({ open, onClose, onCreated }: Props) {
  const t = useTranslations("createLobby");
  const tc = useTranslations("common");
  const [modes, setModes] = useState<GameModeOption[]>([]);
  const [loadingModes, setLoadingModes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"geral" | "regras" | "avancado">("geral");

  const [gameModeId, setGameModeId] = useState("");
  const [name, setName] = useState("");
  const [map, setMap] = useState("de_mirage");
  const [slots, setSlots] = useState<number>(10);
  const [region, setRegion] = useState<(typeof LOBBY_REGION_OPTIONS)[number]>("BR");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [password, setPassword] = useState("");
  const [settings, setSettings] = useState<LobbyRoomSettings>({ ...DEFAULT_LOBBY_SETTINGS });

  useEffect(() => {
    if (!open) return;
    setLoadingModes(true);
    fetch("/api/lobby/modes")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.modes ?? []) as GameModeOption[];
        setModes(list);
        if (list[0]) setGameModeId(list[0].id);
      })
      .finally(() => setLoadingModes(false));
  }, [open]);

  function patchSettings(partial: Partial<LobbyRoomSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error(t("errNameRequired"));
      return;
    }
    if (visibility === "private" && password.length < 4) {
      toast.error(t("errPasswordShort"));
      return;
    }

    setSaving(true);
    const result = await secureApi<{ room: LobbyRoomEnriched }>("/api/lobby/rooms", {
      method: "POST",
      json: {
        gameModeId,
        name: name.trim(),
        map,
        slots,
        region,
        visibility,
        password: visibility === "private" ? password : undefined,
        settings,
      },
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    onCreated(result.data.room);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
        >
          <button
            type="button"
            className="absolute inset-0 scrim-dim"
            aria-label={tc("close")}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border glass-modal shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold">{t("title")}</h2>
                <p className="text-xs text-muted">{t("subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-border px-5 py-3">
              {(["geral", "regras", "avancado"] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setTab(tabKey)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                    tab === tabKey
                      ? "bg-primary/20 text-primary"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {tabKey === "geral" && t("tabGeneral")}
                  {tabKey === "regras" && t("tabRules")}
                  {tabKey === "avancado" && t("tabAdvanced")}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingModes ? (
                <div className="flex justify-center py-12 text-muted">
                  <Loader2 className="h-6 w-6 motion-safe-spin" />
                </div>
              ) : (
                <>
                  {tab === "geral" && (
                    <div className="space-y-4">
                      <Input
                        label={t("nameLabel")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("namePlaceholder")}
                      />
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                          {t("modeLabel")}
                        </label>
                        <select
                          value={gameModeId}
                          onChange={(e) => setGameModeId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                        >
                          {modes.map((mode) => (
                            <option key={mode.id} value={mode.id}>
                              {mode.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <MapPicker value={map} onChange={setMap} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                            {t("slotsLabel")}
                          </label>
                          <select
                            value={String(slots)}
                            onChange={(e) => setSlots(Number(e.target.value))}
                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                          >
                            {LOBBY_SLOT_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {t("playersOption", { n })}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                            {t("regionLabel")}
                          </label>
                          <select
                            value={region}
                            onChange={(e) =>
                              setRegion(e.target.value as (typeof LOBBY_REGION_OPTIONS)[number])
                            }
                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                          >
                            {LOBBY_REGION_OPTIONS.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                          {t("visibilityLabel")}
                        </label>
                        <div className="flex gap-2">
                          {(["public", "private"] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setVisibility(v)}
                              className={cn(
                                "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                                visibility === v
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border text-muted",
                              )}
                            >
                              {v === "public" ? t("public") : t("privateWithPassword")}
                            </button>
                          ))}
                        </div>
                      </div>
                      {visibility === "private" && (
                        <Input
                          label={t("passwordLabel")}
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  {tab === "regras" && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                            {t("tickrateLabel")}
                          </label>
                          <select
                            value={String(settings.tickrate)}
                            onChange={(e) =>
                              patchSettings({
                                tickrate: Number(e.target.value) as 64 | 128,
                              })
                            }
                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                          >
                            <option value="64">64 tick</option>
                            <option value="128">128 tick</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                            {t("weaponsLabel")}
                          </label>
                          <select
                            value={settings.weapons}
                            onChange={(e) =>
                              patchSettings({
                                weapons: e.target
                                  .value as (typeof LOBBY_WEAPON_OPTIONS)[number],
                              })
                            }
                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                          >
                            {LOBBY_WEAPON_OPTIONS.map((w) => (
                              <option key={w} value={w}>
                                {t(WEAPON_LABEL_KEYS[w])}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { key: "friendlyFire" as const, label: t("friendlyFire") },
                          { key: "overtime" as const, label: t("overtime") },
                          { key: "knifeRound" as const, label: t("knifeRound") },
                          { key: "autoKick" as const, label: t("autoKick") },
                          { key: "voiceRequired" as const, label: t("voiceRequired") },
                          { key: "allowSpectators" as const, label: t("spectators") },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={settings[key]}
                              onChange={(e) => patchSettings({ [key]: e.target.checked })}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "avancado" && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label={t("minLevelLabel")}
                          type="number"
                          min={1}
                          max={20}
                          value={String(settings.minLevel)}
                          onChange={(e) =>
                            patchSettings({ minLevel: Number(e.target.value) })
                          }
                        />
                        <Input
                          label={t("maxLevelLabel")}
                          type="number"
                          min={1}
                          max={20}
                          value={String(settings.maxLevel)}
                          onChange={(e) =>
                            patchSettings({ maxLevel: Number(e.target.value) })
                          }
                        />
                      </div>
                      <Input
                        label={t("warmupLabel")}
                        type="number"
                        min={0}
                        max={300}
                        value={String(settings.warmupSeconds)}
                        onChange={(e) =>
                          patchSettings({ warmupSeconds: Number(e.target.value) })
                        }
                      />
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                          {t("descriptionLabel")}
                        </label>
                        <textarea
                          value={settings.description}
                          onChange={(e) => patchSettings({ description: e.target.value })}
                          rows={3}
                          maxLength={200}
                          className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                          placeholder={t("descriptionPlaceholder")}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="ghost" size="md" className="normal-case tracking-normal" onClick={onClose}>
                {tc("cancel")}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="normal-case tracking-normal"
                disabled={saving || loadingModes}
                onClick={handleSubmit}
              >
                {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : t("createRoom")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
