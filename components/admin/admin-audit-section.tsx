"use client";

import { useEffect, useState } from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  createdAt: string;
  admin: { nickname: string };
};

export function AdminAuditSection() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit?page=${page}&limit=30`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setLogs(data.logs);
        setPages(data.pages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="rounded-card glass-strong overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ScrollText className="h-5 w-5 text-primary" />
            Log de auditoria
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{log.summary}</p>
                    <p className="mt-1 text-xs text-muted">
                      {log.admin.nickname} · {log.action} · {log.targetType}
                      {log.targetId && ` #${log.targetId.slice(0, 8)}`}
                    </p>
                  </div>
                  <time className="text-xs text-muted shrink-0">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted">Página {page} de {pages}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
