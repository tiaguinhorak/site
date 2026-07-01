"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search } from "lucide-react";
import { LobbyPageSkeleton } from "@/components/loading/page-skeletons";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ModalPortal } from "@/components/ui/modal-portal";
import { Input } from "@/components/ui/input";
import { LobbyRoomCard } from "@/components/dashboard/lobby-room-card";
import { SteamRequiredCard } from "@/components/dashboard/steam-required-card";
import { useUser } from "@/lib/hooks/use-user";
import { secureApi } from "@/lib/api/client";
import { useRankedParty } from "@/components/providers/ranked-party-provider";
import {
  useRealtimeInvalidate,
  useRealtimeStatus,
} from "@/components/providers/realtime-provider";
import {
  applyLobbyFilters,
  defaultLobbyFilters,
  type LobbyFilters,
  type LobbyRoomEnriched,
} from "@/lib/lobby";

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 rounded-xl border border-border glass-input px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LobbySection() {
  const router = useRouter();
  const t = useTranslations("lobby");
  const tc = useTranslations("common");
  const { user, loading: userLoading } = useUser();
  const { forceClearStuckMatch } = useRankedParty();
  const { connected: realtimeConnected } = useRealtimeStatus();
  const statusOptions: { value: LobbyFilters["status"]; label: string }[] = [
    { value: "all", label: t("statusAll") },
    { value: "open", label: t("statusOpen") },
    { value: "full", label: t("statusFull") },
    { value: "closed", label: t("statusClosed") },
  ];
  const regionOptions: { value: LobbyFilters["region"]; label: string }[] = [
    { value: "all", label: t("regionAll") },
    { value: "BR", label: t("regionBR") },
    { value: "LATAM", label: t("regionLATAM") },
  ];
  const [rooms, setRooms] = useState<LobbyRoomEnriched[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [filters, setFilters] = useState<LobbyFilters>(defaultLobbyFilters);
  const [banner, setBanner] = useState<{
    tone: "ok" | "err";
    text: string;
    showForceClear?: boolean;
  } | null>(null);
  const [joinRoomId, setJoinRoomId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [joining, setJoining] = useState(false);

  const loadRooms = useCallback(async () => {
    const res = await fetch("/api/lobby", { credentials: "same-origin" });
    if (!res.ok) {
      setRooms([]);
      return;
    }
    const data = await res.json();
    setRooms(data.rooms ?? []);
  }, []);

  useRealtimeInvalidate(() => {
    if (document.visibilityState === "hidden") return;
    void loadRooms();
  });

  useEffect(() => {
    loadRooms().finally(() => setLoadingRooms(false));
  }, [loadRooms]);

  useEffect(() => {
    if (realtimeConnected) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadRooms();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [loadRooms, realtimeConnected]);

  const filteredRooms = useMemo(
    () => applyLobbyFilters(rooms, filters),
    [rooms, filters],
  );

  const modeOptions = useMemo(() => {
    const modes = new Map<string, string>();
    for (const room of rooms) {
      modes.set(room.modeId, room.modeName);
    }
    return [
      { value: "all", label: t("allModes") },
      ...Array.from(modes.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [rooms, t]);

  async function handleAutoLobby() {
    setBanner(null);
    const result = await secureApi<{ room: LobbyRoomEnriched }>("/api/lobby/auto", {
      method: "POST",
      json: { modeId: filters.modeId !== "all" ? filters.modeId : undefined },
    });
    if (!result.ok) {
      setBanner({ tone: "err", text: result.error });
      return;
    }
    router.push(`/dashboard/lobby/${result.data.room.id}`);
  }

  async function submitJoin(roomId: string, password?: string, retried = false) {
    setJoining(true);
    setBanner(null);
    const result = await secureApi<{ room: LobbyRoomEnriched }>(
      `/api/lobby/rooms/${roomId}/join`,
      {
        method: "POST",
        json: password ? { password } : {},
      },
    );
    if (!result.ok) {
      const isStuckRanked = result.error.includes("partida rankeada ativa");
      if (isStuckRanked && !retried) {
        const cleared = await forceClearStuckMatch();
        if (cleared) {
          await submitJoin(roomId, password, true);
          return;
        }
      }
      setJoining(false);
      setBanner({
        tone: "err",
        text: isStuckRanked
          ? `${result.error}${t("clickReleaseHint")}`
          : result.error,
        showForceClear: isStuckRanked,
      });
      return;
    }
    setJoining(false);
    setJoinRoomId(null);
    setJoinPassword("");
    router.push(`/dashboard/lobby/${roomId}`);
  }

  function handleJoinRequest(room: LobbyRoomEnriched) {
    if (room.isMember) {
      router.push(`/dashboard/lobby/${room.id}`);
      return;
    }
    if (room.hasPassword || room.visibility === "private") {
      setJoinRoomId(room.id);
      setJoinPassword("");
      return;
    }
    void submitJoin(room.id);
  }

  if (userLoading) {
    return <LobbyPageSkeleton />;
  }

  if (!user?.steamLinked) {
    return (
      <SteamRequiredCard
        title={t("steamTitle")}
        description={t("steamDesc")}
      />
    );
  }

  const totalPlayers = rooms.reduce((sum, room) => sum + room.players, 0);
  const openRooms = rooms.filter((room) => room.players < room.slots && !room.locked).length;

  return (
    <section className="space-y-6">
      {joinRoomId && (
        <ModalPortal>
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 scrim-dim"
            aria-label={t("close")}
            onClick={() => setJoinRoomId(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl glass-modal p-5 shadow-2xl">
            <h3 className="font-display font-bold">{t("roomPassword")}</h3>
            <p className="mt-1 text-sm text-muted">{t("privateRoom")}</p>
            <div className="mt-4">
              <Input
                label={t("passwordLabel")}
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setJoinRoomId(null)}>
                {tc("cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={joining}
                onClick={() => void submitJoin(joinRoomId, joinPassword)}
              >
                {joining ? <Spinner size="sm" /> : t("enter")}
              </Button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      <div className="rounded-card glass-strong p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{t("openRooms")}</h2>
            <p className="mt-1 text-sm text-muted">{t("openRoomsDesc")}</p>
            <p className="mt-2 font-mono text-sm text-foreground">
              {t("players", { count: totalPlayers })}
              <span className="mx-2 text-muted">·</span>
              <span className="text-muted">{t("roomsWithSlots", { count: openRooms })}</span>
              <span className="mx-2 text-muted">·</span>
              <span className="text-muted">{t("shown", { count: filteredRooms.length })}</span>
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="normal-case tracking-normal"
            onClick={() => void handleAutoLobby()}
          >
            <Sparkles className="h-4 w-4" />
            {t("autoLobby")}
          </Button>
        </div>

        {banner && (
          <div
            className={
              banner.tone === "err"
                ? "mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
                : "mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
            }
            role="status"
          >
            <p>{banner.text}</p>
            {banner.showForceClear && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={joining}
                onClick={() => {
                  void (async () => {
                    setJoining(true);
                    const cleared = await forceClearStuckMatch();
                    setJoining(false);
                    if (cleared) {
                      setBanner({
                        tone: "ok",
                        text: t("stateReleased"),
                      });
                    }
                  })();
                }}
              >
                {t("releaseStuck")}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-card glass p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <Input
              label={t("search")}
              placeholder={t("searchPlaceholder")}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <FilterSelect
            label={t("mode")}
            value={filters.modeId}
            options={modeOptions}
            onChange={(modeId) => setFilters((prev) => ({ ...prev, modeId }))}
          />
          <FilterSelect
            label={t("region")}
            value={filters.region}
            options={regionOptions}
            onChange={(region) => setFilters((prev) => ({ ...prev, region }))}
          />
          <FilterSelect
            label={t("statusLabel")}
            value={filters.status}
            options={statusOptions}
            onChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          />
        </div>
      </div>

      {loadingRooms ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-card" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-card glass p-10 text-center">
          <p className="font-display text-lg font-semibold text-foreground">
            {t("noRooms")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("noRoomsDesc")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 normal-case tracking-normal"
            onClick={() => setFilters(defaultLobbyFilters)}
          >
            {t("clearFilters")}
          </Button>
        </div>
      ) : (
        <ul className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredRooms.map((room, index) => (
            <li key={room.id}>
              <LobbyRoomCard
                room={room}
                index={index}
                onJoin={() => handleJoinRequest(room)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
