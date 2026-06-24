"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { secureApi } from "@/lib/api/client";

type ImportJobStatus = "running" | "done" | "failed";

type ImportJobResponse = {
  jobId: string;
  status: ImportJobStatus;
};

export function useCatalogImportJob(onSettled?: () => void) {
  const [importing, setImporting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPoll(), [clearPoll]);

  const pollJob = useCallback(
    (jobId: string) => {
      clearPoll();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/import-jobs/${jobId}`, {
            credentials: "same-origin",
          });
          if (!res.ok) return;
          const data = await res.json();
          const status = data.job?.status as ImportJobStatus | undefined;
          if (status === "running") return;

          clearPoll();
          setImporting(false);
          onSettled?.();
        } catch {
          clearPoll();
          setImporting(false);
        }
      }, 2000);
    },
    [clearPoll, onSettled],
  );

  const startImport = useCallback(
    async (url: string, json: Record<string, unknown>) => {
      setImporting(true);
      try {
        const result = await secureApi<ImportJobResponse>(url, {
          method: "POST",
          json,
        });
        if (!result.ok) {
          setImporting(false);
          return { ok: false as const, error: result.error };
        }
        if (result.data.jobId) {
          pollJob(result.data.jobId);
        } else {
          setImporting(false);
        }
        return { ok: true as const };
      } catch (err) {
        setImporting(false);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Falha ao importar.",
        };
      }
    },
    [pollJob],
  );

  return { importing, startImport };
}
