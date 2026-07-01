"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { surfaceInputClass } from "@/lib/ui/theme-surfaces";

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

const numberInputClass = cn(
  "h-10 w-full min-w-0 rounded-lg px-3 text-sm tabular-nums",
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  surfaceInputClass,
);

function ConfigNumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase leading-snug tracking-wide text-muted">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={numberInputClass}
      />
    </label>
  );
}

function ConfigToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2.5">
      <span className="min-w-0 flex-1 text-sm leading-snug text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-[color-mix(in_srgb,var(--foreground)_22%,transparent)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.33rem]" : "translate-x-1",
          )}
        />
      </button>
    </div>
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
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold text-foreground">Regras de jogo</h1>
        <p className="mt-1 text-sm text-muted">
          Configuração por pool. Aplicada automaticamente ao subir o servidor e no início de partidas
          rankeadas. Requer o plugin <code>clutch_warmup_rules</code> instalado.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {configs.map((config) => (
          <section
            key={config.pool}
            className="min-w-0 overflow-hidden rounded-card glass-strong p-4 sm:p-5"
          >
            <header className="mb-3 flex min-w-0 items-start justify-between gap-2 border-b border-border/30 pb-3">
              <h2 className="min-w-0 font-display text-sm font-bold uppercase leading-snug tracking-wider text-foreground">
                {POOL_LABEL[config.pool] ?? config.pool}
              </h2>
              <span className="shrink-0 rounded-md bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {config.pool}
              </span>
            </header>

            <div className="flex min-w-0 flex-col gap-2.5">
              <ConfigToggle
                label="Regras ativas"
                checked={config.enabled}
                onChange={(v) => update(config.pool, { enabled: v })}
              />

              <ConfigNumberField
                label="Aquecimento (segundos)"
                min={0}
                max={600}
                value={config.warmupSeconds}
                onChange={(v) => update(config.pool, { warmupSeconds: v })}
              />

              <ConfigNumberField
                label="Gold no aquecimento"
                min={0}
                max={65535}
                value={config.warmupStartMoney}
                onChange={(v) =>
                  update(config.pool, {
                    warmupStartMoney: v,
                    warmupMaxMoney: v,
                  })
                }
              />

              <ConfigToggle
                label="Comprar qualquer arma no aquecimento"
                checked={config.warmupBuyAnywhere}
                onChange={(v) => update(config.pool, { warmupBuyAnywhere: v })}
              />
              <ConfigToggle
                label="Spawns aleatórios"
                checked={config.randomSpawns}
                onChange={(v) => update(config.pool, { randomSpawns: v })}
              />
              <ConfigToggle
                label="Respawn deathmatch (ao morrer)"
                checked={config.dmRespawn}
                onChange={(v) => update(config.pool, { dmRespawn: v })}
              />

              <Button
                type="button"
                variant="primary"
                className="mt-1 w-full"
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
          </section>
        ))}
      </div>
    </div>
  );
}
