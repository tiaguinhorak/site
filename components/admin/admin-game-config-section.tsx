"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type GameConfig = {
  pool: string;
  enabled: boolean;
  warmupSeconds: number;
  warmupStartMoney: number;
  warmupMaxMoney: number;
  warmupBuyAnywhere: boolean;
  randomSpawns: boolean;
  dmRespawn: boolean;
  gameType: number;
  gameMode: number;
};

const POOL_LABEL: Record<string, string> = {
  ranked: "Rankeado (fila 5v5)",
  warmup: "Warmup / público",
  deathmatch: "Deathmatch",
  public: "Público (legado)",
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-[color-mix(in_srgb,var(--foreground)_20%,transparent)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function AdminGameConfigSection() {
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPool, setSavingPool] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/game-config", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { configs: GameConfig[] }) => {
        setConfigs(data.configs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(load, []);

  function update(pool: string, patch: Partial<GameConfig>) {
    setConfigs((prev) =>
      prev.map((c) => (c.pool === pool ? { ...c, ...patch } : c)),
    );
  }

  async function save(config: GameConfig) {
    setSavingPool(config.pool);
    const result = await secureApi("/api/admin/game-config", {
      method: "PUT",
      json: config,
    });
    setSavingPool(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Regras do pool "${config.pool}" salvas.`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Regras de jogo</h1>
        <p className="mt-1 text-sm text-muted">
          Configuração por pool. Aplicada automaticamente ao subir o servidor e no início de partidas
          rankeadas. Requer o plugin <code>clutch_warmup_rules</code> instalado.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {configs.map((config) => (
          <div
            key={config.pool}
            className="rounded-card glass-strong p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {POOL_LABEL[config.pool] ?? config.pool}
              </h2>
              <span className="text-[10px] uppercase tracking-wider text-muted">{config.pool}</span>
            </div>

            <Toggle
              label="Regras ativas"
              checked={config.enabled}
              onChange={(v) => update(config.pool, { enabled: v })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Aquecimento (segundos)"
                type="number"
                min={0}
                max={600}
                value={config.warmupSeconds}
                onChange={(e) =>
                  update(config.pool, { warmupSeconds: Number(e.target.value) })
                }
              />
              <Input
                label="Gold no aquecimento"
                type="number"
                min={0}
                max={65535}
                value={config.warmupStartMoney}
                onChange={(e) =>
                  update(config.pool, {
                    warmupStartMoney: Number(e.target.value),
                    warmupMaxMoney: Number(e.target.value),
                  })
                }
              />
            </div>

            <Toggle
              label="Comprar qualquer arma no aquecimento"
              checked={config.warmupBuyAnywhere}
              onChange={(v) => update(config.pool, { warmupBuyAnywhere: v })}
            />
            <Toggle
              label="Spawns aleatórios"
              checked={config.randomSpawns}
              onChange={(v) => update(config.pool, { randomSpawns: v })}
            />
            <Toggle
              label="Respawn deathmatch (ao morrer)"
              checked={config.dmRespawn}
              onChange={(v) => update(config.pool, { dmRespawn: v })}
            />

            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={savingPool === config.pool ? true : undefined}
              onClick={() => save(config)}
            >
              {savingPool === config.pool ? (
                <Loader2 className="h-4 w-4 motion-safe-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Salvar {config.pool}
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
