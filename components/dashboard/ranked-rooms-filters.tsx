"use client";

import {
  BadgeCheck,
  HelpCircle,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type RankedRoomStatusFilter =
  | "all"
  | "open"
  | "full"
  | "in_match"
  | "challengeable";

export type RankedPlayWithFilter = "all" | "steam" | "premium";

export type RankedRoomsFilterState = {
  search: string;
  levelMin: number;
  levelMax: number;
  onlyWithSlots: boolean;
  statusFilter: RankedRoomStatusFilter;
  viewMode: "rooms" | "players";
  playWith: RankedPlayWithFilter;
};

export const DEFAULT_RANKED_FILTERS: RankedRoomsFilterState = {
  search: "",
  levelMin: 1,
  levelMax: 20,
  onlyWithSlots: false,
  statusFilter: "all",
  viewMode: "rooms",
  playWith: "all",
};

type Props = {
  filters: RankedRoomsFilterState;
  onChange: (patch: Partial<RankedRoomsFilterState>) => void;
  onClear: () => void;
  roomCount: number;
  playerCount: number;
  activeFilterCount: number;
};

export function RankedRoomsFilters({
  filters,
  onChange,
  onClear,
  roomCount,
  playerCount,
  activeFilterCount,
}: Props) {
  const t = useTranslations("ranked.filters");
  return (
    <div className="rounded-card glass-strong border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 sm:grid-cols-[140px_1fr_auto]">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
          {t("skillLevel")}
          <HelpCircle className="h-3.5 w-3.5 text-primary" aria-hidden />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="viewMode"
                checked={filters.viewMode === "rooms"}
                onChange={() => onChange({ viewMode: "rooms" })}
                className="accent-primary"
              />
              {t("rooms")}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="viewMode"
                checked={filters.viewMode === "players"}
                onChange={() => onChange({ viewMode: "players" })}
                className="accent-primary"
              />
              {t("players")}
            </label>
          </div>
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            {filters.viewMode === "rooms" ? roomCount : playerCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
          {t("filtersCount", { count: activeFilterCount })}
        </button>
      </div>

      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
          <span>{t("levelShort", { n: filters.levelMin })}</span>
          <span>{t("levelShort", { n: filters.levelMax })}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            type="range"
            min={1}
            max={20}
            value={filters.levelMin}
            onChange={(e) =>
              onChange({
                levelMin: Math.min(Number(e.target.value), filters.levelMax),
              })
            }
            className="h-1.5 w-full accent-primary"
          />
          <input
            type="range"
            min={1}
            max={20}
            value={filters.levelMax}
            onChange={(e) =>
              onChange({
                levelMax: Math.max(Number(e.target.value), filters.levelMin),
              })
            }
            className="h-1.5 w-full accent-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 sm:grid-cols-[140px_1fr]">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          {t("playWith")}
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all" as const, label: t("all"), icon: Users },
              { id: "steam" as const, label: t("verified"), icon: BadgeCheck },
              { id: "premium" as const, label: t("verifiedOrPrime"), icon: Shield },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ playWith: id })}
              className={cn(
                "flex h-11 min-w-[5rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-2 text-[10px] font-semibold transition-all",
                filters.playWith === id
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_-8px_var(--primary)]"
                  : "border-border text-muted hover:border-primary/40 hover:bg-primary/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 sm:grid-cols-[140px_1fr]">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          {t("availability")}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.onlyWithSlots}
            onChange={(e) => onChange({ onlyWithSlots: e.target.checked })}
            className="rounded accent-primary"
          />
          {t("showWithSlots")}
        </label>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[140px_1fr]">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          {t("searchRooms")}
        </span>
        <div className="relative">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-xl border border-border bg-transparent px-3 pr-10 text-sm outline-none focus:border-primary"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
      </div>
    </div>
  );
}
