"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";

type SmurfPanelData = {
  user: {
    smurfStatus: string;
    smurfRiskScore: number;
    rankedSmurfHoldUntil: string | null;
    steamAccountCreatedAt: string | null;
  };
  signals: Array<{
    id: string;
    signalType: string;
    score: number;
    metadata: Record<string, unknown>;
    createdAt: string;
    resolved: boolean;
  }>;
};

export function AdminSmurfPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<SmurfPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/admin/smurf/${userId}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => setData(body))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function setStatus(action: "clear" | "review" | "flag" | "confirm") {
    setActing(action);
    const result = await secureApi(`/api/admin/smurf/${userId}`, {
      method: "PATCH",
      json: { action },
    });
    setActing(null);
    if (result.ok) load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 motion-safe-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="rounded-xl border border-border/60 p-4">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold">
        <ShieldAlert className="h-4 w-4 text-amber-400" />
        Anti-smurf
      </h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Status</dt>
          <dd className="font-semibold">{data.user.smurfStatus}</dd>
        </div>
        <div>
          <dt className="text-muted">Risk score</dt>
          <dd className="font-semibold">{data.user.smurfRiskScore}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Ranked hold até</dt>
          <dd>
            {data.user.rankedSmurfHoldUntil
              ? new Date(data.user.rankedSmurfHoldUntil).toLocaleString("pt-BR")
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["clear", "review", "flag", "confirm"] as const).map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={action === "confirm" ? "primary" : "outline"}
            disabled={acting !== null}
            onClick={() => void setStatus(action)}
          >
            {acting === action ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : action}
          </Button>
        ))}
      </div>

      {data.signals.length > 0 && (
        <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
          {data.signals.map((signal) => (
            <li key={signal.id}>
              {signal.signalType} (+{signal.score}) ·{" "}
              {new Date(signal.createdAt).toLocaleDateString("pt-BR")}
              {signal.resolved ? " · resolvido" : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
