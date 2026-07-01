"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Swords,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  useRankedParty,
  RANKED_TEAM_SIZE,
} from "@/components/providers/ranked-party-provider";
import { useFriendsOptional } from "@/components/providers/friends-provider";
import { SocialUserName } from "@/components/social/social-user-name";
import { SocialUserRow } from "@/components/social/social-user-row";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { MapChip } from "@/components/ui/map-chip";
import type { RankedPartyMemberView, RankedPartyView } from "@/lib/ranked/party-shared";
import { UserProfileAvatar } from "@/components/profile/user-profile-avatar";
import { cn } from "@/lib/utils";
import { textWarningClass, textWarningSoftClass } from "@/lib/ui/theme-surfaces";

function CompactSlot({
  player,
  kicking,
  onKick,
  t,
  large,
}: {
  player: RankedPartyMemberView | null;
  kicking?: boolean;
  onKick?: (userId: string) => void;
  t: ReturnType<typeof useTranslations>;
  large?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {player ? (
        <UserProfileAvatar
          avatarUrl={player.avatarUrl}
          nickname={player.nickname}
          customization={player.customization}
          size={large ? "md" : "sm"}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] text-muted ring-2 ring-border/50 ring-dashed",
            large ? "h-12 w-12 rounded-xl" : "h-10 w-10 rounded-lg",
          )}
        >
          <Users className="h-3.5 w-3.5" />
        </div>
      )}
      <p
        className={cn(
          "truncate font-medium text-foreground",
          large ? "max-w-[5.5rem] text-xs" : "max-w-[4.5rem] text-[10px]",
        )}
      >
        {player ? (
          <SocialUserName user={player} nameClassName={large ? "text-xs" : "text-[10px]"} />
        ) : (
          t("slotEmpty")
        )}
      </p>
      {player?.canKick && onKick && (
        <button
          type="button"
          disabled={kicking}
          onClick={() => onKick(player.id)}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/25 text-rose-300"
          aria-label={t("removeAria", { nickname: player.displayName })}
        >
          {kicking ? (
            <Loader2 className="h-2.5 w-2.5 motion-safe-spin" />
          ) : (
            <UserMinus className="h-2.5 w-2.5" />
          )}
        </button>
      )}
    </div>
  );
}

function RankedFriendsInvite({ team }: { team: RankedPartyView }) {
  const friendsCtx = useFriendsOptional();
  const t = useTranslations("friends");
  const tInvite = useTranslations("friends.invite");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!team.isLeader || team.memberCount >= RANKED_TEAM_SIZE || !friendsCtx) return null;

  const memberIds = new Set(team.members.map((m) => m.id));
  const inviteable = friendsCtx.friends.filter((f) => !memberIds.has(f.id));
  if (inviteable.length === 0) return null;

  async function inviteFriend(friendId: string, displayName: string) {
    setBusyId(friendId);
    const result = await secureApi("/api/ranked/party/invite", {
      method: "POST",
      json: { toUserId: friendId },
    });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(tInvite("sent", { nickname: displayName }));
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {t("inviteRankedFriends")}
      </p>
      <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
        {inviteable.map((friend) => (
          <li
            key={friend.id}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-black/10 px-2 py-1.5"
          >
            <UserProfileAvatar
              avatarUrl={friend.avatarUrl}
              nickname={friend.nickname}
              customization={friend.customization}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <SocialUserName user={friend} nameClassName="text-xs" />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-2 text-xs"
              disabled={busyId === friend.id}
              confirm={{
                title: t("inviteRankedConfirmTitle"),
                description: t("inviteRankedConfirmDesc", { nickname: friend.displayName }),
                confirmLabel: t("inviteRanked"),
                tone: "default",
              }}
              onClick={() => void inviteFriend(friend.id, friend.displayName)}
            >
              {busyId === friend.id ? (
                <Loader2 className="h-3.5 w-3.5 motion-safe-spin" />
              ) : (
                <Swords className="h-3.5 w-3.5" />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankedTeamCompact({
  team,
  onEditTeam,
  onCreateTeam,
  variant = "card",
}: {
  team: RankedPartyView | null;
  onEditTeam?: () => void;
  onCreateTeam?: () => void;
  variant?: "card" | "sidebar";
}) {
  const { leaveParty, disbandTeam, kickMember } = useRankedParty();
  const t = useTranslations("ranked.team");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [kickLoading, setKickLoading] = useState<string | null>(null);

  if (!team) {
    return (
      <div className="rounded-card glass border border-dashed border-border p-5 text-center">
        <Users className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-sm font-medium text-foreground">{t("noTeamTitle")}</p>
        <p className="mt-1 text-xs text-muted">{t("noTeamDesc")}</p>
        {onCreateTeam && (
          <Button variant="primary" size="sm" className="mt-4" onClick={onCreateTeam}>
            {t("createTeam")}
          </Button>
        )}
      </div>
    );
  }

  const partyFull = team.memberCount >= RANKED_TEAM_SIZE;
  const isSidebar = variant === "sidebar";
  const slots: (RankedPartyMemberView | null)[] = Array.from(
    { length: RANKED_TEAM_SIZE },
    (_, i) => team.members.find((m) => m.slotIndex === i) ?? null,
  );

  async function handleCopyInvite() {
    const link = `${window.location.origin}/dashboard/ranked?join=${team!.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn(!isSidebar && "rounded-card glass-strong border border-primary/20 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={cn(
              "flex items-center gap-1.5 font-display font-bold",
              isSidebar ? "text-base" : "text-sm",
            )}
          >
            {team.visibility === "private" ? (
              <Lock className={cn("h-3.5 w-3.5 shrink-0", textWarningSoftClass)} />
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
            )}
            <span className="truncate">{team.name}</span>
          </h3>
          <p className="mt-1 text-xs text-muted">
            {t("regionLevel", {
              region: team.region,
              min: team.minLevel,
              max: team.maxLevel,
            })}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
            partyFull
              ? "bg-violet-500/20 text-violet-300"
              : "bg-primary/15 text-primary",
          )}
        >
          {team.memberCount}/{RANKED_TEAM_SIZE}
        </span>
      </div>

      <div className={cn("mt-4 flex justify-between gap-2", isSidebar && "gap-3")}>
        {slots.map((player, i) => (
          <CompactSlot
            key={i}
            t={t}
            large={isSidebar}
            player={player}
            kicking={kickLoading === player?.id}
            onKick={
              team.isLeader && player?.canKick
                ? async (userId) => {
                    setKickLoading(userId);
                    await kickMember(userId);
                    setKickLoading(null);
                  }
                : undefined
            }
          />
        ))}
      </div>

      {team.mapPool.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {team.mapPool.slice(0, 5).map((map) => (
            <MapChip key={map} mapId={map} />
          ))}
          {team.mapPool.length > 5 && (
            <span className="text-[10px] text-muted">+{team.mapPool.length - 5}</span>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("inviteTitle")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
          >
            <Copy className="h-4 w-4" />
            {copied ? t("copied") : t("copyInviteLink")}
          </button>
          <code className="rounded-lg border border-border/60 bg-black/20 px-2 py-1 font-mono text-[10px] text-muted">
            {team.inviteCode.slice(0, 10)}…
          </code>
        </div>
        <p className="text-[11px] text-muted">{t("inviteHint")}</p>
      </div>

      <RankedFriendsInvite team={team} />

      <div className="mt-4 flex flex-wrap gap-2">
        {team.isLeader && onEditTeam && (
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={onEditTeam}>
            <Pencil className="h-3 w-3" />
            {t("edit")}
          </Button>
        )}
        {team.isLeader ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            confirm={{
              title: t("disbandConfirmTitle"),
              description: t("disbandConfirmDesc"),
              confirmLabel: t("disbandConfirm"),
              cancelLabel: tc("cancel"),
              tone: "danger",
            }}
            onClick={() => void disbandTeam()}
          >
            <Trash2 className="h-3 w-3" />
            {t("disband")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => void leaveParty()}>
            {t("leave")}
          </Button>
        )}
      </div>

      {partyFull ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-violet-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("ready")}
        </p>
      ) : (
        <p className={cn("mt-4 text-sm", textWarningClass)}>
          {t("need", { count: RANKED_TEAM_SIZE - team.memberCount })}
        </p>
      )}
    </div>
  );
}
