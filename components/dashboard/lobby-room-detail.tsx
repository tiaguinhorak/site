"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LogOut,
  Play,
  Settings,
  Swords,
  Trash2,
  Users,
} from "lucide-react";
import { LobbyPageSkeleton } from "@/components/loading/page-skeletons";
import { Spinner } from "@/components/ui/spinner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { SocialUserRow } from "@/components/social/social-user-row";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/admin/pickers/map-picker";
import { secureApi } from "@/lib/api/client";
import {
  useRealtimeInvalidate,
  useRealtimeStatus,
} from "@/components/providers/realtime-provider";
import type { LobbyRoomEnriched } from "@/lib/lobby";
import { LOBBY_WEAPON_OPTIONS, type LobbyRoomSettings } from "@/lib/lobby/schemas";
import { toast } from "@/lib/toast";

const WEAPON_LABEL_KEYS: Record<(typeof LOBBY_WEAPON_OPTIONS)[number], string> = {
  all: "weaponAll",
  pistols: "weaponPistols",
  smg: "weaponSmg",
  rifles: "weaponRifles",
  snipers: "weaponSnipers",
};

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function LobbyRoomDetail({ roomId }: { roomId: string }) {
  const router = useRouter();
  const t = useTranslations("lobbyDetail");
  const tc = useTranslations("common");
  const { connected: realtimeConnected } = useRealtimeStatus();
  const [room, setRoom] = useState<LobbyRoomEnriched | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMap, setEditMap] = useState("");
  const [saving, setSaving] = useState(false);
  const [startingMatch, setStartingMatch] = useState(false);

  const loadRoom = useCallback(async () => {
    const res = await fetch(`/api/lobby/rooms/${roomId}`, { credentials: "same-origin" });
    if (!res.ok) {
      setError(t("notFound"));
      setRoom(null);
      return;
    }
    const data = await res.json();
    setRoom(data.room);
    setEditName(data.room.name);
    setEditMap(data.room.map);
    setError(null);
  }, [roomId, t]);

  useRealtimeInvalidate(() => {
    if (editing) return;
    if (document.visibilityState === "hidden") return;
    void loadRoom();
  });

  useEffect(() => {
    loadRoom().finally(() => setLoading(false));
  }, [loadRoom]);

  useEffect(() => {
    if (realtimeConnected) return;
    const interval = window.setInterval(() => {
      if (editing) return;
      if (document.visibilityState === "hidden") return;
      void loadRoom();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [loadRoom, realtimeConnected, editing]);

  async function handleLeave() {
    const result = await secureApi(`/api/lobby/rooms/${roomId}/leave`, { method: "POST" });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push("/dashboard/lobby");
    router.refresh();
  }

  async function handleClose() {
    const result = await secureApi(`/api/lobby/rooms/${roomId}`, { method: "DELETE" });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push("/dashboard/lobby");
    router.refresh();
  }

  async function handleSave() {
    setSaving(true);
    const result = await secureApi<{ room: LobbyRoomEnriched }>(`/api/lobby/rooms/${roomId}`, {
      method: "PATCH",
      json: { name: editName, map: editMap },
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRoom(result.data.room);
    setEditing(false);
  }

  async function handleStartMatch() {
    setStartingMatch(true);
    const result = await secureApi<{ ok: boolean; message?: string; error?: string }>(
      `/api/lobby/rooms/${roomId}/start-match`,
      { method: "POST", json: { fillBots: true } },
    );
    setStartingMatch(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await loadRoom();
  }

  if (loading) {
    return <LobbyPageSkeleton />;
  }

  if (error || !room) {
    return (
      <div className="rounded-card glass p-8 text-center">
        <p className="text-rose-400">{error ?? t("unavailable")}</p>
        <ButtonLinkBack label={t("backToLobby")} />
      </div>
    );
  }

  const settings = room.settings as LobbyRoomSettings | undefined;
  const isHost = room.isHost;
  const is2x2Room = room.slots === 4;
  const canStartMatch =
    is2x2Room &&
    room.status !== "in_match" &&
    (isHost || room.isMember) &&
    room.players >= 2;

  return (
    <section className="space-y-6">
      <Link
        href="/dashboard/lobby"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToLobby")}
      </Link>

      <div className="rounded-card glass-strong p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl">{room.regionFlag}</span>
              <h1 className="font-display text-2xl font-bold">{room.name}</h1>
              {room.visibility === "private" && (
                <span className="badge-amber px-2 py-0.5 text-xs">
                  {t("private")}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              {room.modeName} · {room.map} · {room.ping}ms · {t("hostLabel")}: {room.hostDisplayName ?? room.hostNickname}
            </p>
            <p className="mt-1 font-mono text-sm">
              {t("playersCount", { players: room.players, slots: room.slots })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canStartMatch && (
              <Button
                variant="primary"
                size="sm"
                disabled={startingMatch}
                onClick={() => void handleStartMatch()}
              >
                {startingMatch ? (
                  <Spinner size="sm" />
                ) : (
                  <Swords className="h-4 w-4" />
                )}
                {t("start2x2")}
              </Button>
            )}
            {room.isMember && (
              <Button
                variant="outline"
                size="sm"
                className="normal-case tracking-normal"
                onClick={handleLeave}
              >
                <LogOut className="h-4 w-4" />
                {tc("leave")}
              </Button>
            )}
            {isHost && (
              <>
                <Button
                  variant="glass"
                  size="sm"
                  className="normal-case tracking-normal"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Settings className="h-4 w-4" />
                  {t("editRoom")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="normal-case tracking-normal text-rose-400"
                  onClick={handleClose}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("closeRoom")}
                </Button>
              </>
            )}
          </div>
        </div>

        {is2x2Room && room.status !== "in_match" && (
          <p className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
            {t("room2x2Note")}
          </p>
        )}

        {room.status === "in_match" && (
          <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
            {t("matchInProgress")}
          </p>
        )}

        {editing && isHost && (
          <div className="mt-6 space-y-4 rounded-xl border border-border p-4">
            <Input label={t("nameLabel")} value={editName} onChange={(e) => setEditName(e.target.value)} />
            <MapPicker value={editMap} onChange={setEditMap} />
            <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? <Spinner size="sm" /> : tc("save")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card glass p-5">
          <h2 className="flex items-center gap-2 font-display font-bold">
            <Users className="h-4 w-4 text-primary" />
            {t("playersInRoom")}
          </h2>
          <ul className="mt-4 space-y-2">
            {room.members.filter(Boolean).length === 0 ? (
              <li className="text-sm text-muted">{t("waitingPlayers")}</li>
            ) : (
              room.members.map((member, i) =>
                member ? (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <SocialUserRow
                      user={member}
                      subtitle={
                        <p className="text-xs text-muted">{t("levelLabel", { level: member.level })}</p>
                      }
                    />
                    {member.id === room.hostUserId && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase text-primary">
                        {t("hostLabel")}
                      </span>
                    )}
                  </li>
                ) : (
                  <li key={`empty-${i}`} className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted">
                    {t("emptySlot")}
                  </li>
                ),
              )
            )}
          </ul>
        </div>

        {settings && (
          <div className="rounded-card glass p-5">
            <h2 className="font-display font-bold">{t("settingsTitle")}</h2>
            <div className="mt-4 space-y-2">
              <SettingRow label={t("tickrateRow")} value={`${settings.tickrate} tick`} />
              <SettingRow label={t("weaponsRow")} value={t(WEAPON_LABEL_KEYS[settings.weapons])} />
              <SettingRow label={t("friendlyFireRow")} value={settings.friendlyFire ? tc("yes") : tc("no")} />
              <SettingRow label={t("overtimeRow")} value={settings.overtime ? tc("yes") : tc("no")} />
              <SettingRow label={t("knifeRoundRow")} value={settings.knifeRound ? tc("yes") : tc("no")} />
              <SettingRow
                label={t("allowedLevel")}
                value={`${settings.minLevel} – ${settings.maxLevel}`}
              />
              <SettingRow label={t("warmupRow")} value={`${settings.warmupSeconds}s`} />
              {settings.description && (
                <p className="rounded-xl border border-border px-3 py-2 text-sm text-muted">
                  {settings.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ButtonLinkBack({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/lobby"
      className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
