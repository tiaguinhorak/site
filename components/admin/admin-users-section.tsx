"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users, ExternalLink, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SocialUserName } from "@/components/social/social-user-name";

type UserRow = {
  id: string;
  nickname: string;
  email: string | null;
  firstName: string;
  lastName: string;
  plan: string;
  steamId: string | null;
  steamPersonaName: string | null;
  displayName?: string;
  steamAvatarUrl: string | null;
  avatarUrl: string | null;
  country: string;
  isAdmin: boolean;
  isBanned: boolean;
  banInfo: { reason: string } | null;
  mfaEnabled: boolean;
  anticheatInstalled: boolean;
  createdAt: string;
  elo: number;
  rank: number;
};

export function AdminUsersSection() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState("");
  const [bannedOnly, setBannedOnly] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (search) params.set("q", search);
    if (plan) params.set("plan", plan);
    if (bannedOnly) params.set("banned", "true");
    if (adminOnly) params.set("isAdmin", "true");

    fetch(`/api/admin/users?${params}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, plan, bannedOnly, adminOnly]);

  return (
    <div className="space-y-6">
      <form
        className="flex flex-col gap-3 lg:flex-row lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Nickname, e-mail, Steam ID, nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button type="submit" variant="primary" size="md">Buscar</Button>
      </form>

      <div className="flex flex-wrap gap-3">
        <select
          value={plan}
          onChange={(e) => {
            setPage(1);
            setPlan(e.target.value);
          }}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todos os planos</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
          <option value="ELITE">Elite</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
          <input type="checkbox" checked={bannedOnly} onChange={(e) => { setPage(1); setBannedOnly(e.target.checked); }} />
          Banidos
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
          <input type="checkbox" checked={adminOnly} onChange={(e) => { setPage(1); setAdminOnly(e.target.checked); }} />
          Admins
        </label>
      </div>

      <p className="text-sm text-muted">
        {total} usuário{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      <div className="overflow-hidden rounded-card glass-strong">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Usuário</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">E-mail</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Steam</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Status</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted">Plano</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">Carregando...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">Nenhum usuário.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                          {user.avatarUrl || user.steamAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatarUrl ?? user.steamAvatarUrl ?? ""} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Users className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <SocialUserName user={user} nameClassName="text-sm font-semibold" showPlanBadge />
                          <p className="text-xs text-muted">@{user.nickname}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{user.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {user.steamId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                          <Ban className="h-3 w-3" />
                          Banido
                        </span>
                      ) : user.isAdmin ? (
                        <span className="text-xs font-semibold text-primary">Admin</span>
                      ) : (
                        <span className="text-xs text-muted">Ativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                        user.plan === "ELITE" ? "badge-amber text-[10px] uppercase tracking-wide" :
                        user.plan === "PREMIUM" ? "bg-primary/15 text-primary" : "bg-muted/20 text-muted",
                      )}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/usuarios/${user.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Gerenciar
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
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
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted">Página {page} de {pages}</span>
          <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
