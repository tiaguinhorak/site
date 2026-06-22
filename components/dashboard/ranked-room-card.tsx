"use client";

import { Crown, Loader2, Lock, Swords, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { RankedPartyMemberView, RankedPartyView } from "@/lib/ranked/party-shared";
import { AvatarImage } from "@/components/ui/avatar-image";
import { ClutchAvatarFallback } from "@/components/ui/clutch-avatar-fallback";
import { cn } from "@/lib/utils";

const RANKED_SLOTS = 5;

type RankedRoomAction =
  | { kind: "join" }
  | { kind: "challenge" }
  | { kind: "open" }
  | { kind: "full" }
  | { kind: "in_match" }
  | { kind: "locked" }
  | { kind: "in_team" };

function MemberAvatar({
  player,
  emptyLabel,
}: {
  player: RankedPartyMemberView | null;
  emptyLabel: string;
}) {
  return (
    <div className="relative h-10 w-10" title={player?.nickname ?? emptyLabel}>
      <div
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[11px] font-bold ring-2",
          player
            ? "bg-[linear-gradient(135deg,var(--primary-soft),var(--primary))] text-white ring-primary/40"
            : "bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] text-muted ring-border/60",
        )}
      >
        {player?.avatarUrl ? (
          <AvatarImage src={player.avatarUrl} size={40} className="rounded-full" />
        ) : player ? (
          <ClutchAvatarFallback
            initials={player.avatarInitials}
            className="h-full w-full rounded-full text-[10px]"
          />
        ) : (
          <Users className="h-4 w-4" />
        )}
      </div>
      {player?.isLeader && (
        <span className="absolute -bottom-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] text-black ring-2 ring-background">
          <Crown className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

export function RankedRoomCard({
  room,
  action,
  busy,
  onJoin,
  onChallenge,
}: {
  room: RankedPartyView;
  action: RankedRoomAction;
  busy: boolean;
  onJoin: (partyId: string) => void;
  onChallenge: (partyId: string) => void;
}) {
  const t = useTranslations("ranked.card");
  const slots: (RankedPartyMemberView | null)[] = Array.from(
    { length: RANKED_SLOTS },
    (_, i) => room.members.find((m) => m.slotIndex === i) ?? null,
  );

  const isHighlighted = action.kind === "join" || action.kind === "challenge";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border p-4 transition-colors",
        isHighlighted
          ? "border-primary/40 glass-strong"
          : "border-border glass",
        room.status === "in_match" && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {room.region}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t("level")}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] font-display text-sm font-bold text-primary">
            {room.avgLevel}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 truncate font-display text-base font-bold text-foreground">
          {room.visibility === "private" && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-label={t("privateAria")} />
          )}
          <span className="truncate">{room.name}</span>
        </h3>
        <p className="text-xs text-muted">
          {t("players", { count: room.memberCount, total: room.slots })}
          {room.isMember && ` · ${t("youAreHere")}`}
        </p>
        {(room.minLevel > 1 || room.maxLevel < 20) && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            {t("levelRange", { min: room.minLevel, max: room.maxLevel })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {slots.map((player, i) => (
          <MemberAvatar
            key={player?.id ?? `slot-${i}`}
            player={player}
            emptyLabel={t("emptySlot")}
          />
        ))}
      </div>

      <RoomActionButton
        room={room}
        action={action}
        busy={busy}
        onJoin={onJoin}
        onChallenge={onChallenge}
      />
    </div>
  );
}

function RoomActionButton({
  room,
  action,
  busy,
  onJoin,
  onChallenge,
}: {
  room: RankedPartyView;
  action: RankedRoomAction;
  busy: boolean;
  onJoin: (partyId: string) => void;
  onChallenge: (partyId: string) => void;
}) {
  const t = useTranslations("ranked.card");
  switch (action.kind) {
    case "join":
      return (
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={() => onJoin(room.id)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          {t("join")}
        </Button>
      );
    case "challenge":
      return (
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={() => onChallenge(room.id)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          {t("challenge")}
        </Button>
      );
    case "open":
      return (
        <Button variant="outline" className="w-full" disabled>
          {room.isMember ? t("yourRoom") : t("waitingSlot")}
        </Button>
      );
    case "full":
      return (
        <Button variant="outline" className="w-full" disabled>
          <Lock className="h-3.5 w-3.5" />
          {t("full")}
        </Button>
      );
    case "in_match":
      return (
        <Button variant="outline" className="w-full" disabled>
          <Swords className="h-3.5 w-3.5" />
          {t("inMatch")}
        </Button>
      );
    case "locked":
      return (
        <Button variant="outline" className="w-full" disabled>
          <Lock className="h-3.5 w-3.5" />
          {t("subscribe")}
        </Button>
      );
    case "in_team":
      return (
        <Button variant="outline" className="w-full" disabled>
          {t("alreadyInTeam")}
        </Button>
      );
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
