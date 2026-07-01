"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  GameModeRoomsSection,
  type GameModeView,
} from "@/components/dashboard/game-mode-rooms-section";
import { SkeletonCard } from "@/components/ui/skeleton";

export function GameModeRoomsClient({ modeId }: { modeId: string }) {
  const tl = useTranslations("lobbyDetail");
  const [mode, setMode] = useState<GameModeView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/game-modes/${encodeURIComponent(modeId)}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { mode: GameModeView };
        return json.mode;
      })
      .then((payload) => {
        if (!cancelled) setMode(payload);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [modeId]);

  if (error) {
    return (
      <p className="alert-warning px-4 py-3 text-sm">
        Não foi possível carregar o modo.
      </p>
    );
  }

  if (!mode) {
    return <SkeletonCard className="h-96" />;
  }

  return (
    <>
      <Link
        href="/dashboard/lobby"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tl("backToLobby")}
      </Link>
      <GameModeRoomsSection mode={mode} />
    </>
  );
}
