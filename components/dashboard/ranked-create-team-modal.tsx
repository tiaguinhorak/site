"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import {
  RANKED_REGION_OPTIONS,
  type RankedPartyView,
  type RankedTeamConfigInput,
} from "@/lib/ranked/party-shared";
import {
  RANKED_MAP_LABELS,
  RANKED_MAP_POOL,
  RANKED_MAP_POOL_MIN,
} from "@/lib/ranked/constants";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  team?: RankedPartyView | null;
  onClose: () => void;
  onSubmit: (config: RankedTeamConfigInput) => Promise<boolean>;
};

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

export function RankedCreateTeamModal({ open, mode, team, onClose, onSubmit }: Props) {
  const { pausePolling, resumePolling } = useRankedParty();
  const t = useTranslations("ranked.modal");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [region, setRegion] = useState<(typeof RANKED_REGION_OPTIONS)[number]>("BR");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [password, setPassword] = useState("");
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(20);
  const [selectedMaps, setSelectedMaps] = useState<string[]>([...RANKED_MAP_POOL]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    pausePolling();
    return () => resumePolling();
  }, [open, pausePolling, resumePolling]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPassword("");
    if (mode === "edit" && team) {
      setName(team.name?.startsWith("Time ") ? "" : team.name ?? "");
      setRegion((team.region as (typeof RANKED_REGION_OPTIONS)[number]) ?? "BR");
      setVisibility(team.visibility ?? "public");
      setMinLevel(team.minLevel ?? 1);
      setMaxLevel(team.maxLevel ?? 20);
      setSelectedMaps(team.mapPool?.length ? [...team.mapPool] : [...RANKED_MAP_POOL]);
    } else {
      setName("");
      setRegion("BR");
      setVisibility("public");
      setMinLevel(1);
      setMaxLevel(20);
      setSelectedMaps([...RANKED_MAP_POOL]);
    }
  }, [open, mode, team]);

  async function handleSubmit() {
    setError(null);
    if (minLevel > maxLevel) {
      setError(t("errorLevel"));
      return;
    }
    const needsPassword =
      visibility === "private" && (mode === "create" || !team?.hasPassword);
    if (needsPassword && password.length < 4) {
      setError(t("errorPassword"));
      return;
    }
    if (selectedMaps.length < RANKED_MAP_POOL_MIN) {
      setError(t("errorMaps", { min: RANKED_MAP_POOL_MIN }));
      return;
    }

    const config: RankedTeamConfigInput = {
      name: name.trim(),
      region,
      visibility,
      minLevel,
      maxLevel,
      mapPool: selectedMaps,
    };
    if (visibility === "private" && password) {
      config.password = password;
    }
    if (visibility === "public" && mode === "edit" && team?.hasPassword) {
      config.clearPassword = true;
    }

    setSaving(true);
    const ok = await onSubmit(config);
    setSaving(false);
    if (ok) onClose();
    else setError(t("errorSave"));
  }

  function toggleMap(map: string) {
    setSelectedMaps((prev) => {
      if (prev.includes(map)) {
        if (prev.length <= RANKED_MAP_POOL_MIN) return prev;
        return prev.filter((m) => m !== map);
      }
      return [...prev, map];
    });
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
            className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border glass-modal shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold">
                  {mode === "create" ? t("createTitle") : t("editTitle")}
                </h2>
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

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Input
                label={t("teamName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("teamNamePlaceholder")}
                maxLength={32}
              />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("region")}
                </label>
                <select
                  value={region}
                  onChange={(e) =>
                    setRegion(e.target.value as (typeof RANKED_REGION_OPTIONS)[number])
                  }
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                >
                  {RANKED_REGION_OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("visibility")}
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
                      {v === "public" ? t("public") : t("private")}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {visibility === "public" ? t("publicHint") : t("privateHint")}
                </p>
              </div>

              {visibility === "private" && (
                <Input
                  label={
                    mode === "edit" && team?.hasPassword
                      ? t("newPassword")
                      : t("teamPassword")
                  }
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                    {t("minLevel")}
                  </label>
                  <select
                    value={String(minLevel)}
                    onChange={(e) => setMinLevel(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                  >
                    {LEVELS.map((n) => (
                      <option key={n} value={n}>
                        {t("levelN", { n })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                    {t("maxLevel")}
                  </label>
                  <select
                    value={String(maxLevel)}
                    onChange={(e) => setMaxLevel(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
                  >
                    {LEVELS.map((n) => (
                      <option key={n} value={n}>
                        {t("levelN", { n })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("mapsForVote", {
                    selected: selectedMaps.length,
                    total: RANKED_MAP_POOL.length,
                  })}
                </label>
                <p className="mb-2 text-xs text-muted">
                  {t("mapsHint", { min: RANKED_MAP_POOL_MIN })}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {RANKED_MAP_POOL.map((map) => {
                    const active = selectedMaps.includes(map);
                    return (
                      <button
                        key={map}
                        type="button"
                        onClick={() => toggleMap(map)}
                        className={cn(
                          "rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted hover:border-primary/40",
                        )}
                      >
                        {RANKED_MAP_LABELS[map]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="ghost" size="md" className="normal-case tracking-normal" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="normal-case tracking-normal"
                disabled={saving}
                onClick={() => void handleSubmit()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "create" ? (
                  t("create")
                ) : (
                  t("save")
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
