"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

type Status = {
  configured: boolean;
  reachable: boolean;
  target?: string;
  hint?: string;
};

export function GameServerPushBanner() {
  const t = useTranslations("inventory");
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/inventory/game-server-status", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.reachable) return null;

  return (
    <div
      className="mb-4 flex gap-3 rounded-card border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-semibold">{t("gameServerPushBannerTitle")}</p>
        {status.target && (
          <p className="mt-1 text-xs opacity-90">
            {t("gameServerPushTarget", { target: status.target })}
          </p>
        )}
        <p className="mt-1 opacity-90">
          {status.hint ?? t("gameServerPushBannerHint")}
        </p>
      </div>
    </div>
  );
}
