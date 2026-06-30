import { useCallback, useEffect, useState } from "react";
import type { WarmupModeDef } from "@/lib/warmup/modes";

type WarmupModesResponse = {
  modes: WarmupModeDef[];
};

export function useWarmupModes(includeDisabled = false) {
  const [modes, setModes] = useState<WarmupModeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = includeDisabled ? "?all=1" : "";
      const res = await fetch(`/api/warmup-modes${qs}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Falha ao carregar modos warmup.");
      const data = (await res.json()) as WarmupModesResponse;
      setModes(data.modes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar modos.");
      setModes([]);
    } finally {
      setLoading(false);
    }
  }, [includeDisabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { modes, loading, error, reload: load };
}
