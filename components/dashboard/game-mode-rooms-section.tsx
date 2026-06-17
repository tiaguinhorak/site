"use client";

import { motion } from "motion/react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SteamRequiredCard } from "@/components/dashboard/steam-required-card";
import { confirmPresets } from "@/lib/confirm-presets";
import { useUser } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";

export type GameModeRoomView = {
  id: string;
  name: string;
  map: string;
  players: number;
  slots: number;
  ping: number;
};

export type GameModeView = {
  id: string;
  name: string;
  accent: string;
  rooms: GameModeRoomView[];
};

export function GameModeRoomsSection({ mode }: { mode: GameModeView }) {
  const { user, loading } = useUser();

  const totalPlayers = mode.rooms.reduce((sum, room) => sum + room.players, 0);
  const totalSlots = mode.rooms.reduce((sum, room) => sum + room.slots, 0);

  if (loading) {
    return (
      <div className="rounded-card glass p-8 text-center text-muted">
        Carregando salas...
      </div>
    );
  }

  if (!user?.steamLinked) {
    return (
      <SteamRequiredCard
        title="Steam necessária para entrar"
        description="Vincule sua conta Steam para conectar aos servidores e aparecer no ranking."
      />
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card glass px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>
            <span className="font-mono font-semibold text-foreground">
              {totalPlayers}
            </span>
            <span className="text-muted"> / {totalSlots} jogadores online</span>
          </span>
        </div>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
        <span className="text-sm text-muted">{mode.rooms.length} salas ativas</span>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-3 sm:gap-4">
        {mode.rooms.map((room, i) => {
          const full = room.players >= room.slots;
          const pct = Math.min((room.players / room.slots) * 100, 100);

          return (
            <motion.li
              key={room.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="relative overflow-hidden rounded-card glass p-4 sm:p-5"
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-15 blur-2xl",
                  mode.accent,
                )}
                aria-hidden
              />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      full ? "bg-rose-500" : "bg-emerald-400",
                      !full && "animate-pulse-glow",
                    )}
                    aria-hidden
                  />
                  <p className="font-display text-base font-semibold text-foreground sm:text-lg">
                    {room.name}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] sm:w-28">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary-soft),var(--primary))]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm text-foreground">
                      {room.players}/{room.slots}
                    </span>
                  </div>

                  <Button
                    variant={full ? "outline" : "primary"}
                    size="sm"
                    className="shrink-0"
                    confirm={
                      full
                        ? confirmPresets.joinQueue(room.name)
                        : confirmPresets.connectServer(room.name, mode.name)
                    }
                    onClick={() => {}}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {full ? "Fila" : "Entrar"}
                  </Button>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
