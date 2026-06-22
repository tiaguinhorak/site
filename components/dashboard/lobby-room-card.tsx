"use client";

import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  getLevelTier,
  getLobbyRoomStatus,
  type LobbyPlayer,
  type LobbyRoomEnriched,
} from "@/lib/lobby";
import { AvatarImage } from "@/components/ui/avatar-image";
import { ClutchAvatarFallback } from "@/components/ui/clutch-avatar-fallback";
import { cn } from "@/lib/utils";

function LevelBadge({ level, tier }: { level: number; tier: "low" | "mid" | "high" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 font-mono text-[10px] font-bold",
        tier === "high" && "bg-violet-500/25 text-violet-300",
        tier === "mid" && "bg-cyan-500/25 text-cyan-300",
        tier === "low" && "bg-slate-500/25 text-slate-300",
      )}
    >
      {level}
    </span>
  );
}

function PlayerAvatar({ player }: { player: LobbyPlayer }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-[11px] font-bold text-foreground shadow-[0_0_16px_-4px_var(--primary)]",
          player.steamVerified ? "border-primary" : "border-border",
        )}
      >
        {player.avatarUrl ? (
          <AvatarImage src={player.avatarUrl} size={44} className="rounded-full" />
        ) : (
          <ClutchAvatarFallback
            initials={player.avatarInitials}
            className="h-full w-full rounded-full text-[10px]"
          />
        )}
      </div>
      {player.steamVerified && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <BadgeCheck className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

function EmptySlot() {
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-border/80 bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
      aria-hidden
    />
  );
}

type LobbyRoomCardProps = {
  room: LobbyRoomEnriched;
  index?: number;
  onJoin?: () => void;
};

export function LobbyRoomCard({ room, index = 0, onJoin }: LobbyRoomCardProps) {
  const t = useTranslations("lobbyCard");
  const status = getLobbyRoomStatus(room);
  const isFull = status === "full";
  const isClosed = status === "closed";
  const canJoin = status === "open";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-border glass-strong p-4 sm:p-5"
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
          room.accent,
        )}
        aria-hidden
      />

      <header className="relative flex items-center justify-between gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg glass-chip text-lg"
          title={room.regionLabel}
        >
          {room.regionFlag}
        </span>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] font-display text-sm font-bold text-primary shadow-[0_0_20px_-6px_var(--primary)]"
          title={t("avgLevelTitle")}
        >
          {room.avgLevel}
        </div>

        <span className="flex h-8 w-8 items-center justify-center">
          {room.verified ? (
            <BadgeCheck className="h-5 w-5 text-primary" aria-label={t("verifiedRoom")} />
          ) : (
            <span className="h-5 w-5" aria-hidden />
          )}
        </span>
      </header>

      <div className="relative mt-4 text-center">
        <h3 className="truncate font-display text-base font-bold text-foreground sm:text-lg">
          {room.name}
        </h3>
        <p className="mt-1 text-xs text-muted">
          {room.modeName} · {room.map} · {room.ping}ms
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
          {room.regionLabel} · {room.players}/{room.slots} {t("slotsLabel")}
          {room.hasPassword ? " · 🔒" : ""}
        </p>
      </div>

      <div className="relative mt-5 flex justify-center gap-2 sm:gap-2.5">
        {room.members.map((member, slotIndex) =>
          member ? (
            <PlayerAvatar key={member.id} player={member} />
          ) : (
            <EmptySlot key={`empty-${room.id}-${slotIndex}`} />
          ),
        )}
      </div>

      <div className="relative mt-2 flex justify-center gap-2 sm:gap-2.5">
        {room.members.map((member, slotIndex) => (
          <div key={`level-${room.id}-${slotIndex}`} className="flex w-11 justify-center">
            {member ? (
              <LevelBadge level={member.level} tier={getLevelTier(member.level)} />
            ) : (
              <span className="h-5 w-5" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <div className="relative mt-5">
        {canJoin ? (
          <Button
            variant="primary"
            size="md"
            className="w-full normal-case tracking-normal"
            onClick={onJoin}
          >
            <ArrowRight className="h-4 w-4" />
            {room.isMember ? t("openRoom") : t("enter")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="md"
            className="w-full cursor-not-allowed normal-case tracking-normal opacity-70"
            disabled
          >
            <Lock className="h-4 w-4" />
            {isClosed ? t("closed") : t("teamFull")}
          </Button>
        )}

        {isFull && !isClosed && onJoin && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full normal-case tracking-normal text-muted"
            onClick={onJoin}
          >
            {t("viewRoom")}
          </Button>
        )}
      </div>
    </motion.article>
  );
}
