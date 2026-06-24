"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gavel, Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { punishmentTypeLabel } from "@/lib/admin/punishment-labels";
import type { PunishmentType } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type PunishmentRow = {
  id: string;
  type: PunishmentType;
  scope: string;
  serverName: string;
  reason: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    nickname: string;
    email: string | null;
    steamPersonaName: string | null;
    avatarUrl: string | null;
    steamAvatarUrl: string | null;
  };
  admin: { nickname: string };
  revokedBy: { nickname: string } | null;
};

const TYPES: PunishmentType[] = ["BAN", "MUTE", "WARNING", "KICK", "RESTRICT"];

export function AdminPunishmentsSection() {
  const [punishments, setPunishments] = useState<PunishmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState("true");

  function load() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (filterType) params.set("type", filterType);
    if (filterActive) params.set("active", filterActive);

    fetch(`/api/admin/punishments?${params}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setPunishments(data.punishments);
        setPages(data.pages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [page, filterType, filterActive]);

  async function revoke(id: string, type: PunishmentType) {
    const result = await secureApi("/api/admin/punishments/" + id, {
      method: "PATCH",
      json: { revoke: true },
    });
    if (result.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => {
            setPage(1);
            setFilterType(e.target.value);
          }}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{punishmentTypeLabel(t)}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => {
            setPage(1);
            setFilterActive(e.target.value);
          }}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        >
          <option value="true">Ativas</option>
          <option value="false">Revogadas</option>
          <option value="">Todas</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-card glass-strong">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Usuário</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Tipo</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Motivo</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Admin</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Expira</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    <Loader2 className="mx-auto h-6 w-6 motion-safe-spin" />
                  </td>
                </tr>
              ) : punishments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Nenhuma punição encontrada.
                  </td>
                </tr>
              ) : (
                punishments.map((p) => (
                  <tr key={p.id} className="hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/usuarios/${p.user.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {p.user.nickname}
                      </Link>
                      <p className="text-xs text-muted">
                        {p.user.steamPersonaName ?? p.user.email ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          p.type === "BAN"
                            ? "bg-rose-500/15 text-rose-400"
                            : p.type === "WARNING"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-primary/15 text-primary",
                        )}
                      >
                        {p.type === "BAN" && <Ban className="h-3 w-3" />}
                        {punishmentTypeLabel(p.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-muted">
                      {p.reason}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.admin.nickname}</td>
                    <td className="px-4 py-3 text-muted">
                      {p.expiresAt
                        ? new Date(p.expiresAt).toLocaleDateString("pt-BR")
                        : "Permanente"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.active && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="normal-case tracking-normal"
                          confirm={confirmPresets.revokePunishment(
                            punishmentTypeLabel(p.type),
                          )}
                          onClick={() => revoke(p.id, p.type)}
                        >
                          Revogar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
