"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Crown,
  Loader2,
  LogOut,
  Plus,
  Shield,
  ShieldCheck,
  Swords,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  Camera,
  Lock,
  Unlock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AvatarImage } from "@/components/ui/avatar-image";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EloRankBadgeI18n } from "@/components/ranked/elo-rank-badge-i18n";
import { getCountryFlag } from "@/lib/profile";
import { getDefaultAvatarPresetUrl } from "@/lib/profile/avatar";
import { secureApi, secureFormApi } from "@/lib/api/client";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ClanRole = "OWNER" | "OFFICER" | "MEMBER";

type ClanMemberView = {
  userId: string;
  nickname: string;
  displayName: string;
  country: string;
  avatarUrl: string | null;
  role: ClanRole;
  level: number;
  elo: number;
  points: number;
  kills: number;
  wins: number;
  mvps: number;
  joinedAt: string;
};

type ClanStats = {
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  totalKills: number;
  totalWins: number;
  totalMvps: number;
  avgElo: number;
};

type ClanJoinRequestView = {
  id: string;
  userId: string;
  nickname: string;
  displayName: string;
  avatarUrl: string | null;
  country: string;
  level: number;
  elo: number;
  message: string;
  createdAt: string;
};

type ClanDetail = {
  id: string;
  tag: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  joinMode: "OPEN" | "CLOSED";
  ownerId: string;
  createdAt: string;
  stats: ClanStats;
  members: ClanMemberView[];
  viewerRole: ClanRole | null;
  pendingRequests: ClanJoinRequestView[];
};

type ClanRankingEntry = {
  id: string;
  tag: string;
  name: string;
  avatarUrl: string | null;
  joinMode: "OPEN" | "CLOSED";
  rank: number;
  memberCount: number;
  totalPoints: number;
  totalXp: number;
  avgElo: number;
};

const roleIcon: Record<ClanRole, typeof Crown> = {
  OWNER: Crown,
  OFFICER: ShieldCheck,
  MEMBER: Shield,
};

export function ClansSection() {
  const t = useTranslations("clans");
  const { user } = useUser();
  const [ranking, setRanking] = useState<ClanRankingEntry[]>([]);
  const [myClan, setMyClan] = useState<ClanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinMode, setJoinMode] = useState<"OPEN" | "CLOSED">("OPEN");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/clans", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        setRanking(d.ranking ?? []);
        setMyClan(d.myClan ?? null);
      })
      .catch(() => {
        setRanking([]);
        setMyClan(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (busy) return;
    setBusy(true);
    const result = await secureApi("/api/clans", {
      method: "POST",
      json: { tag, name, description, joinMode },
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("created"));
    setTag("");
    setName("");
    setDescription("");
    load();
  }

  async function handleJoin(clanId: string) {
    if (busy) return;
    setBusy(true);
    const result = await secureApi(`/api/clans/${clanId}/join`, { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const data = result.data as { pending?: boolean; clan?: ClanDetail };
    if (data.pending) {
      toast.success(t("requestSent"));
      return;
    }
    toast.success(t("joined"));
    load();
  }

  async function handleLeave() {
    if (busy) return;
    setBusy(true);
    const result = await secureApi("/api/clans/leave", { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("left"));
    load();
  }

  async function manage(body: Record<string, unknown>, successMsg: string) {
    if (!myClan || busy) return;
    setBusy(true);
    const result = await secureApi(`/api/clans/${myClan.id}/manage`, {
      method: "POST",
      json: body,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(successMsg);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-card glass p-12">
        <Loader2 className="h-8 w-8 motion-safe-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {myClan ? (
        <ClanDashboard
          clan={myClan}
          busy={busy}
          onLeave={handleLeave}
          onManage={manage}
          onRefresh={load}
          t={t}
        />
      ) : (
        <CreateClanCard
          tag={tag}
          name={name}
          description={description}
          joinMode={joinMode}
          isElite={user?.plan === "elite"}
          busy={busy}
          setTag={setTag}
          setName={setName}
          setDescription={setDescription}
          setJoinMode={setJoinMode}
          onCreate={handleCreate}
          t={t}
        />
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Trophy className="h-5 w-5 text-primary" />
          {t("rankingTitle")}
        </h2>
        {ranking.length === 0 ? (
          <div className="rounded-card glass p-8 text-center text-muted">{t("noClans")}</div>
        ) : (
          <ul className="overflow-hidden rounded-card glass">
            {ranking.map((clan) => (
              <li
                key={clan.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <span
                  className={cn(
                    "w-7 text-center font-display text-lg font-bold",
                    clan.rank === 1
                      ? "text-amber-400"
                      : clan.rank === 2
                        ? "text-zinc-300"
                        : clan.rank === 3
                          ? "text-orange-400"
                          : "text-muted",
                  )}
                >
                  {clan.rank}
                </span>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border">
                  <AvatarImage src={clan.avatarUrl ?? getDefaultAvatarPresetUrl()} alt="" size={40} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    <span className="text-primary">[{clan.tag}]</span> {clan.name}
                  </p>
                  <p className="text-xs text-muted">
                    {t("memberCount", { count: clan.memberCount })} ·{" "}
                    <EloRankBadgeI18n elo={clan.avgElo} size="sm" />
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-gradient">
                    {clan.totalPoints.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">{t("points")}</p>
                </div>
                {!myClan && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleJoin(clan.id)}
                  >
                    {clan.joinMode === "CLOSED" ? t("requestJoin") : t("join")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateClanCard({
  tag,
  name,
  description,
  joinMode,
  isElite,
  busy,
  setTag,
  setName,
  setDescription,
  setJoinMode,
  onCreate,
  t,
}: {
  tag: string;
  name: string;
  description: string;
  joinMode: "OPEN" | "CLOSED";
  isElite: boolean;
  busy: boolean;
  setTag: (v: string) => void;
  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setJoinMode: (v: "OPEN" | "CLOSED") => void;
  onCreate: () => void;
  t: ReturnType<typeof useTranslations<"clans">>;
}) {
  if (!isElite) {
    return (
      <div className="rounded-card glass-strong p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-400" />
          <h2 className="font-display text-lg font-bold text-foreground">{t("eliteRequiredTitle")}</h2>
        </div>
        <p className="mt-2 text-sm text-muted">{t("eliteRequiredDesc")}</p>
        <div className="mt-4">
          <ButtonLink href="/dashboard/premium" variant="primary">
            {t("upgradeElite")}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card glass-strong p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">{t("createTitle")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">{t("createDesc")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Input
          label={t("tagLabel")}
          value={tag}
          maxLength={6}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
          placeholder="CLAN"
        />
        <Input
          label={t("nameLabel")}
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
      </div>
      <div className="mt-3">
        <Input
          label={t("descLabel")}
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descPlaceholder")}
        />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t("joinModeLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {(["OPEN", "CLOSED"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setJoinMode(mode)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                joinMode === mode
                  ? "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary"
                  : "border border-border text-muted hover:text-foreground",
              )}
            >
              {mode === "OPEN" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {mode === "OPEN" ? t("joinModeOpen") : t("joinModeClosed")}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {joinMode === "OPEN" ? t("joinModeOpenHint") : t("joinModeClosedHint")}
        </p>
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          disabled={busy || tag.length < 2 || name.length < 3}
          onClick={onCreate}
        >
          {busy ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : <Plus className="h-4 w-4" />}
          {t("createButton")}
        </Button>
      </div>
    </div>
  );
}

function ClanDashboard({
  clan,
  busy,
  onLeave,
  onManage,
  onRefresh,
  t,
}: {
  clan: ClanDetail;
  busy: boolean;
  onLeave: () => void;
  onManage: (body: Record<string, unknown>, successMsg: string) => void;
  onRefresh: () => void;
  t: ReturnType<typeof useTranslations<"clans">>;
}) {
  const canManage = clan.viewerRole === "OWNER" || clan.viewerRole === "OFFICER";
  const isOwner = clan.viewerRole === "OWNER";
  const [inviteNick, setInviteNick] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    const form = new FormData();
    form.append("file", file);
    const result = await secureFormApi<{ ok: true }>(`/api/clans/${clan.id}/avatar`, form, {
      method: "POST",
    });
    if (!result.ok) {
      toast.error(result.error ?? t("avatarError"));
      return;
    }
    toast.success(t("avatarUpdated"));
    onRefresh();
  }

  const stats = [
    { label: t("statMembers"), value: `${clan.stats.memberCount}/20` },
    { label: t("points"), value: clan.stats.totalPoints.toLocaleString("pt-BR") },
    { label: t("avgElo"), value: <EloRankBadgeI18n elo={clan.stats.avgElo} size="sm" /> },
    { label: t("statKills"), value: clan.stats.totalKills.toLocaleString("pt-BR") },
    { label: t("statWins"), value: clan.stats.totalWins.toLocaleString("pt-BR") },
    { label: t("statMvps"), value: clan.stats.totalMvps.toLocaleString("pt-BR") },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-card glass-strong p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border">
              <AvatarImage src={clan.avatarUrl ?? getDefaultAvatarPresetUrl()} alt="" size={64} />
              {isOwner && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAvatar(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    aria-label={t("changeAvatar")}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-end justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <Camera className="mb-1 h-4 w-4 text-white" />
                  </button>
                </>
              )}
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">
                <span className="text-primary">[{clan.tag}]</span> {clan.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                {clan.joinMode === "OPEN" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                    <Unlock className="h-3 w-3" /> {t("joinModeOpen")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-amber-400">
                    <Lock className="h-3 w-3" /> {t("joinModeClosed")}
                  </span>
                )}
              </div>
              {isOwner && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["OPEN", "CLOSED"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={clan.joinMode === mode ? "primary" : "outline"}
                      disabled={busy || clan.joinMode === mode}
                      onClick={() =>
                        onManage({ action: "settings", joinMode: mode }, t("settingsSaved"))
                      }
                    >
                      {mode === "OPEN" ? t("joinModeOpen") : t("joinModeClosed")}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            confirm={{
              title: isOwner ? t("disbandConfirmTitle") : t("leaveConfirmTitle"),
              description: isOwner ? t("disbandConfirmDesc") : t("leaveConfirmDesc"),
              confirmLabel: isOwner ? t("disband") : t("leave"),
              tone: "warning",
            }}
            onClick={onLeave}
          >
            <LogOut className="h-4 w-4" />
            {t("leave")}
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border px-3 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {stat.label}
              </p>
              <p className="mt-0.5 font-display text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {canManage && (
        <div className="rounded-card glass p-4 sm:p-5">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <UserPlus className="h-4 w-4 text-primary" />
            {t("inviteTitle")}
          </h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              label={t("invitePlaceholder")}
              value={inviteNick}
              onChange={(e) => setInviteNick(e.target.value)}
              placeholder={t("invitePlaceholder")}
            />
            <Button
              type="button"
              variant="primary"
              disabled={busy || inviteNick.trim().length < 2}
              onClick={() => {
                onManage({ action: "invite", nickname: inviteNick.trim() }, t("invited"));
                setInviteNick("");
              }}
            >
              {t("inviteButton")}
            </Button>
          </div>
        </div>
      )}

      {canManage && clan.pendingRequests.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-primary" />
            {t("requestsTitle", { count: clan.pendingRequests.length })}
          </h2>
          <ul className="overflow-hidden rounded-card glass">
            {clan.pendingRequests.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border">
                  <AvatarImage src={req.avatarUrl ?? getDefaultAvatarPresetUrl()} alt="" size={40} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-foreground">{req.displayName}</p>
                  <p className="text-xs text-muted">
                    {getCountryFlag(req.country)} · <EloRankBadgeI18n elo={req.elo} size="sm" />
                  </p>
                  {req.message && <p className="mt-1 text-xs text-muted">{req.message}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      onManage(
                        { action: "review_request", requestId: req.id, approve: true },
                        t("requestApproved"),
                      )
                    }
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      onManage(
                        { action: "review_request", requestId: req.id, approve: false },
                        t("requestRejected"),
                      )
                    }
                  >
                    {t("reject")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Users className="h-5 w-5 text-primary" />
          {t("membersTitle")}
        </h2>
        <ul className="overflow-hidden rounded-card glass">
          {clan.members.map((member) => {
            const RoleIcon = roleIcon[member.role];
            return (
              <motion.li
                key={member.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border">
                  <AvatarImage
                    src={member.avatarUrl ?? getDefaultAvatarPresetUrl()}
                    alt=""
                    size={40}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/player/${member.nickname}`}
                    prefetch={false}
                    className="flex items-center gap-1.5 truncate font-display text-sm font-semibold text-foreground hover:text-primary"
                  >
                    <RoleIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        member.role === "OWNER"
                          ? "text-amber-400"
                          : member.role === "OFFICER"
                            ? "text-primary"
                            : "text-muted",
                      )}
                    />
                    {member.displayName}
                  </Link>
                  <p className="text-xs text-muted">
                    {getCountryFlag(member.country)} {t("memberLevel", { level: member.level })} ·{" "}
                    {member.points.toLocaleString("pt-BR")} {t("points")}
                  </p>
                </div>

                {canManage && member.role !== "OWNER" && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isOwner && member.role === "MEMBER" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          onManage(
                            { action: "role", targetUserId: member.userId, role: "OFFICER" },
                            t("promoted"),
                          )
                        }
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {isOwner && member.role === "OFFICER" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          onManage(
                            { action: "role", targetUserId: member.userId, role: "MEMBER" },
                            t("demoted"),
                          )
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        onManage({ action: "kick", targetUserId: member.userId }, t("kicked"))
                      }
                    >
                      <UserMinus className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>

        {isOwner && (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              confirm={{
                title: t("disbandConfirmTitle"),
                description: t("disbandConfirmDesc"),
                confirmLabel: t("disband"),
                tone: "warning",
              }}
              onClick={() => onManage({ action: "disband" }, t("disbanded"))}
            >
              <Trash2 className="h-4 w-4 text-rose-400" />
              {t("disband")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
