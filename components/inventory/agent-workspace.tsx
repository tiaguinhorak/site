"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { TeamScopePicker } from "@/components/inventory/team-scope-picker";
import type { EquipSide, LoadoutTeam } from "@/lib/inventory/loadout-team";
import { cn } from "@/lib/utils";
import {
  chipInactiveHoverClass,
  surfaceInputClass,
  surfaceSubtleClass,
} from "@/lib/ui/theme-surfaces";
import { toast } from "@/lib/toast";
import { API_REQUEST_HEADER } from "@/lib/brand";

const inventoryWriteHeaders = {
  "Content-Type": "application/json",
  [API_REQUEST_HEADER]: "1",
} as const;

type AgentPickerItem = {
  id: string;
  defIndex: number;
  name: string;
  imageUrl: string | null;
  rarity: string;
  team: string;
};

type AgentLoadout = {
  agentT: number;
  agentCT: number;
  agentTName: string | null;
  agentCTName: string | null;
  agentTImage: string | null;
  agentCTImage: string | null;
};

type AgentWorkspaceProps = {
  open: boolean;
  canUseAgents?: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const PAGE_SIZE = 12;

export function AgentWorkspace({
  open,
  canUseAgents = true,
  onClose,
  onSaved,
}: AgentWorkspaceProps) {
  const t = useTranslations("inventory");
  const [scope, setScope] = useState<EquipSide>("both");
  const [lastSingleTeam, setLastSingleTeam] = useState<LoadoutTeam>("CT");
  const [loadout, setLoadout] = useState<AgentLoadout | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerItems, setPickerItems] = useState<AgentPickerItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotalPages, setPickerTotalPages] = useState(1);
  const [selectedDefIndex, setSelectedDefIndex] = useState<number | null>(null);

  const editTeam: LoadoutTeam =
    scope === "T" ? "T" : scope === "CT" ? "CT" : lastSingleTeam;

  const currentDefIndex =
    editTeam === "T" ? loadout?.agentT ?? 0 : loadout?.agentCT ?? 0;
  const currentName =
    editTeam === "T" ? loadout?.agentTName : loadout?.agentCTName;
  const currentImage =
    editTeam === "T" ? loadout?.agentTImage : loadout?.agentCTImage;

  const loadLoadout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/agents", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Falha ao carregar agentes.");
      const data = (await res.json()) as AgentLoadout;
      setLoadout(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadPicker = useCallback(async () => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        picker: "1",
        page: String(pickerPage),
        limit: String(PAGE_SIZE),
        team: editTeam,
      });
      if (pickerQuery.trim()) params.set("search", pickerQuery.trim());
      const res = await fetch(`/api/inventory/agents?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Falha ao carregar catálogo.");
      const data = await res.json();
      setPickerItems(data.items ?? []);
      setPickerTotalPages(data.totalPages ?? 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setPickerLoading(false);
    }
  }, [editTeam, pickerPage, pickerQuery, t]);

  useEffect(() => {
    if (!open) return;
    void loadLoadout();
  }, [open, loadLoadout]);

  useEffect(() => {
    if (!open) return;
    void loadPicker();
  }, [open, loadPicker]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setPickerQuery(pickerSearch);
      setPickerPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [pickerSearch, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedDefIndex(currentDefIndex > 0 ? currentDefIndex : null);
  }, [open, currentDefIndex, editTeam]);

  async function saveAgent(defIndex: number) {
    if (!canUseAgents) {
      toast.error(t("agentsPlanRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/agents", {
        method: "POST",
        credentials: "same-origin",
        headers: inventoryWriteHeaders,
        body: JSON.stringify({ team: editTeam, defIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar.");
      setLoadout(data.loadout);
      toast.success(t("agentsSaved"));
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function clearAgent() {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/agents?team=${editTeam}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { [API_REQUEST_HEADER]: "1" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao remover.");
      setLoadout(data.loadout);
      setSelectedDefIndex(null);
      toast.success(t("agentsCleared"));
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  async function saveBothTeams() {
    if (!canUseAgents || !selectedDefIndex) return;
    setSaving(true);
    try {
      for (const team of ["T", "CT"] as const) {
        const params = new URLSearchParams({
          picker: "1",
          page: "1",
          limit: "1",
          team,
        });
        const check = await fetch(`/api/inventory/agents?${params}`, {
          credentials: "same-origin",
        });
        const catalog = await check.json();
        const hasAgent = (catalog.items ?? []).some(
          (item: AgentPickerItem) => item.defIndex === selectedDefIndex,
        );
        if (!hasAgent) continue;
        const res = await fetch("/api/inventory/agents", {
          method: "POST",
          credentials: "same-origin",
          headers: inventoryWriteHeaders,
          body: JSON.stringify({ team, defIndex: selectedDefIndex }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Falha ao salvar.");
        }
        const data = await res.json();
        setLoadout(data.loadout);
      }
      toast.success(t("agentsSaved"));
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  const previewImage = useMemo(() => {
    if (selectedDefIndex) {
      const picked = pickerItems.find((item) => item.defIndex === selectedDefIndex);
      if (picked?.imageUrl) return picked.imageUrl;
    }
    return currentImage;
  }, [selectedDefIndex, pickerItems, currentImage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-bold">{t("agentsWorkspaceTitle")}</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!canUseAgents && (
          <div className={cn("mx-4 mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs", surfaceSubtleClass)}>
            <Lock className="h-4 w-4 shrink-0" />
            {t("agentsPlanRequired")}
          </div>
        )}

        {loadout && (loadout.agentT > 0 || loadout.agentCT > 0) && (
          <div className={cn("mx-4 mt-4 grid gap-2 sm:grid-cols-2", !canUseAgents && "mt-2")}>
            {loadout.agentT > 0 && loadout.agentTName ? (
              <div className={cn("flex items-center gap-3 rounded-xl p-3", surfaceSubtleClass)}>
                {loadout.agentTImage ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/20">
                    <RemoteImage
                      src={loadout.agentTImage}
                      alt={loadout.agentTName}
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                ) : (
                  <UserRound className="h-8 w-8 text-muted" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("teamTShort")} · {t("agentsEquippedBadge")}
                  </p>
                  <p className="truncate text-xs font-medium">{loadout.agentTName}</p>
                </div>
              </div>
            ) : null}
            {loadout.agentCT > 0 && loadout.agentCTName ? (
              <div className={cn("flex items-center gap-3 rounded-xl p-3", surfaceSubtleClass)}>
                {loadout.agentCTImage ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/20">
                    <RemoteImage
                      src={loadout.agentCTImage}
                      alt={loadout.agentCTName}
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                ) : (
                  <UserRound className="h-8 w-8 text-muted" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("teamCTShort")} · {t("agentsEquippedBadge")}
                  </p>
                  <p className="truncate text-xs font-medium">{loadout.agentCTName}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:p-6">
          <div className="space-y-4">
            <TeamScopePicker
              value={scope}
              onChange={(next) => {
                if (next === "T" || next === "CT") setLastSingleTeam(next);
                setScope(next);
              }}
              labels={{
                t: t("teamTShort"),
                ct: t("teamCTShort"),
                both: t("teamBothShort"),
              }}
            />

            <div className={cn("rounded-xl p-4", surfaceSubtleClass)}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 motion-safe-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-xl bg-black/20">
                    {previewImage ? (
                      <RemoteImage
                        src={previewImage}
                        alt={currentName ?? t("catAgent")}
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <UserRound className="h-12 w-12 opacity-40" />
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-center text-sm font-medium">
                    {selectedDefIndex
                      ? pickerItems.find((i) => i.defIndex === selectedDefIndex)?.name ??
                        currentName ??
                        t("agentsPickOne")
                      : currentName ?? t("agentsPickOne")}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!canUseAgents || saving || !selectedDefIndex}
                onClick={() => {
                  if (scope === "both") {
                    void saveBothTeams();
                  } else {
                    void saveAgent(selectedDefIndex ?? 0);
                  }
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : t("agentsEquip")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving || currentDefIndex <= 0}
                onClick={() => void clearAgent()}
              >
                {t("agentsClear")}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={t("agentsSearchPlaceholder")}
                className={cn("w-full rounded-xl py-2 pl-10 pr-3 text-sm", surfaceInputClass)}
              />
            </div>

            <p className="text-xs text-muted">
              {editTeam === "T" ? t("agentsTeamT") : t("agentsTeamCT")}
            </p>

            {pickerLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 motion-safe-spin text-primary" />
              </div>
            ) : pickerItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">{t("agentsEmptyCatalog")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pickerItems.map((item) => {
                  const active = selectedDefIndex === item.defIndex;
                  const equippedOnTeam =
                    editTeam === "T"
                      ? loadout?.agentT === item.defIndex
                      : loadout?.agentCT === item.defIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedDefIndex(item.defIndex)}
                      className={cn(
                        "relative rounded-xl border p-2 text-left transition",
                        active
                          ? "border-primary bg-primary/10"
                          : equippedOnTeam
                            ? "border-emerald-400/50 bg-emerald-500/10"
                            : cn("border-border/50", chipInactiveHoverClass),
                      )}
                    >
                      {equippedOnTeam && (
                        <span className="absolute right-1.5 top-1.5 z-10 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          {t("agentsEquippedBadge")}
                        </span>
                      )}
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-black/20">
                        {item.imageUrl ? (
                          <RemoteImage
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <UserRound className="h-8 w-8 text-muted" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight">
                        {item.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {pickerTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pickerPage <= 1}
                  onClick={() => setPickerPage((p) => Math.max(1, p - 1))}
                >
                  {t("prevPage")}
                </Button>
                <span className="text-xs text-muted">
                  {pickerPage} / {pickerTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pickerPage >= pickerTotalPages}
                  onClick={() => setPickerPage((p) => p + 1)}
                >
                  {t("nextPage")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
