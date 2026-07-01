"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Bell,
  Gavel,
  Loader2,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { SteamIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { punishmentTypeLabel, punishmentServerLabel } from "@/lib/admin/punishment-labels";
import { AdminRankedQueuePanel } from "@/components/admin/admin-ranked-queue-panel";
import { AdminUserInventoryPanel } from "@/components/admin/admin-user-inventory-panel";
import { AdminSmurfPanel } from "@/components/admin/admin-smurf-panel";
import type { PunishmentType } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import { SocialUserName } from "@/components/social/social-user-name";

type Punishment = {
  id: string;
  type: PunishmentType;
  scope: string;
  serverName: string;
  reason: string;
  notes: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  admin: { nickname: string };
  revokedBy: { nickname: string } | null;
};

type UserDetail = {
  id: string;
  nickname: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  bio: string;
  avatarUrl: string | null;
  plan: string;
  rank: number;
  elo: number;
  kd: number;
  matches: number;
  winRate: number;
  hoursPlayed: number;
  anticheatInstalled: boolean;
  mfaEnabled: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  steamId: string | null;
  steamPersonaName: string | null;
  steamAvatarUrl: string | null;
  steamProfileUrl: string | null;
  steamCountryCode: string | null;
  createdAt: string;
  updatedAt: string;
  notifications: Array<{ id: string; title: string; body: string; read: boolean; createdAt: string }>;
  inventory: Array<{ id: string; equipped: boolean; inventoryItem: { name: string; category: string; rarity: string } }>;
  punishments: Punishment[];
};

const TABS = ["resumo", "editar", "inventario", "punicoes", "notificar"] as const;
const PUNISHMENT_TYPES: PunishmentType[] = ["BAN", "MUTE", "WARNING", "KICK", "RESTRICT"];

export function AdminUserDetail({ userId }: { userId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("resumo");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    nickname: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    country: "BR",
    bio: "",
    plan: "FREE",
    isAdmin: false,
    rank: "0",
    elo: "1000",
    kd: "0",
    matches: "0",
    winRate: "0",
    hoursPlayed: "0",
    anticheatInstalled: false,
    mfaEnabled: false,
  });

  const [punishForm, setPunishForm] = useState({
    type: "BAN" as PunishmentType,
    reason: "",
    notes: "",
    durationDays: "7",
    permanent: false,
    scope: "PLATFORM",
    serverName: "",
  });

  const [notifyForm, setNotifyForm] = useState({
    title: "",
    body: "",
    type: "SYSTEM",
  });

  const loadUser = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      setError("Usuário não encontrado.");
      return null;
    }
    const data = await res.json();
    return data.user as UserDetail;
  }, [userId]);

  useEffect(() => {
    loadUser()
      .then((data) => {
        if (!data) return;
        setUser(data);
        setEditForm({
          nickname: data.nickname,
          email: data.email ?? "",
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          country: data.country,
          bio: data.bio,
          plan: data.plan,
          isAdmin: data.isAdmin,
          rank: String(data.rank),
          elo: String(data.elo),
          kd: String(data.kd),
          matches: String(data.matches),
          winRate: String(data.winRate),
          hoursPlayed: String(data.hoursPlayed),
          anticheatInstalled: data.anticheatInstalled,
          mfaEnabled: data.mfaEnabled,
        });
      })
      .catch(() => setError("Usuário não encontrado."));
  }, [loadUser]);

  async function saveUser() {
    setSaving(true);
    setFormError(null);
    setFormSuccess(null);
    const result = await secureApi(`/api/admin/users/${userId}`, {
      method: "PATCH",
      json: {
        nickname: editForm.nickname,
        email: editForm.email || null,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        country: editForm.country,
        bio: editForm.bio,
        plan: editForm.plan,
        isAdmin: editForm.isAdmin,
        rank: Number(editForm.rank),
        elo: Number(editForm.elo),
        kd: Number(editForm.kd),
        matches: Number(editForm.matches),
        winRate: Number(editForm.winRate),
        hoursPlayed: Number(editForm.hoursPlayed),
        anticheatInstalled: editForm.anticheatInstalled,
        mfaEnabled: editForm.mfaEnabled,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormSuccess("Usuário atualizado.");
    const refreshed = await loadUser();
    if (refreshed) setUser(refreshed);
  }

  async function applyPunishment() {
    if (!user || !punishForm.reason.trim()) {
      setFormError("Informe o motivo da punição.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const result = await secureApi(`/api/admin/users/${userId}/punishments`, {
      method: "POST",
      json: {
        type: punishForm.type,
        scope: punishForm.scope,
        serverName: punishForm.serverName,
        reason: punishForm.reason,
        notes: punishForm.notes,
        durationDays: punishForm.permanent ? undefined : Number(punishForm.durationDays),
      },
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormSuccess(`${punishmentTypeLabel(punishForm.type)} aplicada.`);
    setPunishForm((f) => ({ ...f, reason: "", notes: "" }));
    const refreshed = await loadUser();
    if (refreshed) setUser(refreshed);
  }

  async function revokePunishment(id: string, type: PunishmentType) {
    const result = await secureApi(`/api/admin/punishments/${id}`, {
      method: "PATCH",
      json: { revoke: true },
    });
    if (result.ok) {
      const refreshed = await loadUser();
      if (refreshed) setUser(refreshed);
    }
  }

  async function sendNotification() {
    if (!notifyForm.title.trim() || !notifyForm.body.trim()) {
      setFormError("Preencha título e mensagem.");
      return;
    }
    setSaving(true);
    const result = await secureApi("/api/admin/notifications", {
      method: "POST",
      json: {
        userId,
        title: notifyForm.title,
        body: notifyForm.body,
        type: notifyForm.type,
        autoTranslate: true,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormSuccess("Notificação enviada.");
    setNotifyForm({ title: "", body: "", type: "SYSTEM" });
    const refreshed = await loadUser();
    if (refreshed) setUser(refreshed);
  }

  async function unlinkSteam() {
    const result = await secureApi(`/api/admin/users/${userId}/steam/unlink`, {
      method: "POST",
    });
    if (result.ok) {
      const refreshed = await loadUser();
      if (refreshed) setUser(refreshed);
    }
  }

  async function deleteUser() {
    const result = await secureApi(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (result.ok) {
      router.push("/admin/usuarios");
      router.refresh();
    }
  }

  if (error) {
    return (
      <div className="rounded-card glass p-8 text-center text-rose-400">{error}</div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center py-12 text-muted">
        <Loader2 className="h-6 w-6 motion-safe-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à lista
      </Link>

      <div className="rounded-card glass-strong p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/20">
              {user.avatarUrl || user.steamAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl ?? user.steamAvatarUrl ?? ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-xl font-bold">{user.nickname.slice(0, 2)}</span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SocialUserName user={user} nameClassName="text-2xl font-bold" showPlanBadge />
                <p className="text-sm text-muted">@{user.nickname}</p>
                {user.isAdmin && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    Admin
                  </span>
                )}
                {user.isBanned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-400">
                    <Ban className="h-3 w-3" />
                    Banido
                  </span>
                )}
                <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs uppercase text-muted">
                  {user.plan}
                </span>
              </div>
              <p className="text-sm text-muted">{user.email ?? "Perfil incompleto"}</p>
              <p className="font-mono text-[10px] text-muted">{user.id}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.steamId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="normal-case tracking-normal"
                confirm={confirmPresets.unlinkSteamAdmin(user.nickname)}
                onClick={unlinkSteam}
              >
                <SteamIcon className="h-4 w-4" />
                Desvincular Steam
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="normal-case tracking-normal text-rose-400"
              confirm={confirmPresets.deleteUser(user.nickname)}
              onClick={deleteUser}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setFormError(null);
                setFormSuccess(null);
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-primary/20 text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t === "resumo" && "Resumo"}
              {t === "editar" && "Editar"}
              {t === "inventario" && "Inventário"}
              {t === "punicoes" && "Punições"}
              {t === "notificar" && "Notificar"}
            </button>
          ))}
        </div>

        {(formError || formSuccess) && (
          <p
            className={cn(
              "mt-4 rounded-xl px-4 py-3 text-sm",
              formError
                ? "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
            )}
            role={formError ? "alert" : "status"}
          >
            {formError ?? formSuccess}
          </p>
        )}

        {tab === "resumo" && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Rank", value: `#${user.rank}` },
                { label: "ELO", value: user.elo },
                { label: "K/D", value: user.kd.toFixed(2) },
                { label: "Partidas", value: user.matches },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase text-muted">{s.label}</p>
                  <p className="mt-2 font-display text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            <AdminSmurfPanel userId={user.id} />
          </div>
        )}

        {tab === "editar" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input label="Nickname" value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} />
            <Input label="E-mail" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Nome" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
            <Input label="Sobrenome" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
            <Input label="Telefone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="País" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Plano</label>
              <select
                value={editForm.plan}
                onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
              >
                <option value="FREE">FREE</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="ELITE">ELITE</option>
              </select>
            </div>
            <Input label="Rank" type="number" value={editForm.rank} onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })} />
            <Input label="ELO" type="number" value={editForm.elo} onChange={(e) => setEditForm({ ...editForm, elo: e.target.value })} />
            <Input label="K/D" type="number" value={editForm.kd} onChange={(e) => setEditForm({ ...editForm, kd: e.target.value })} />
            <Input label="Partidas" type="number" value={editForm.matches} onChange={(e) => setEditForm({ ...editForm, matches: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.isAdmin} onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })} />
              Admin
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.anticheatInstalled} onChange={(e) => setEditForm({ ...editForm, anticheatInstalled: e.target.checked })} />
              Anticheat instalado
            </label>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Bio</label>
              <textarea
                value={editForm.bio}
                rows={3}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="button" disabled={saving} onClick={saveUser}>
                {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {tab === "punicoes" && (
          <div className="mt-6 space-y-6">
            <AdminRankedQueuePanel
              userId={userId}
              nickname={user.nickname}
              onSuccess={async (msg) => {
                setFormError(null);
                setFormSuccess(msg);
                const refreshed = await loadUser();
                if (refreshed) setUser(refreshed);
              }}
              onError={(msg) => {
                setFormSuccess(null);
                setFormError(msg);
              }}
            />

            <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Gavel className="h-4 w-4 text-primary" />
                Aplicar punição
              </h3>
              <select
                value={punishForm.type}
                onChange={(e) => setPunishForm({ ...punishForm, type: e.target.value as PunishmentType })}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
              >
                {PUNISHMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{punishmentTypeLabel(t)}</option>
                ))}
              </select>
              <Input label="Motivo" value={punishForm.reason} onChange={(e) => setPunishForm({ ...punishForm, reason: e.target.value })} />
              <Input label="Notas internas" value={punishForm.notes} onChange={(e) => setPunishForm({ ...punishForm, notes: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={punishForm.permanent} onChange={(e) => setPunishForm({ ...punishForm, permanent: e.target.checked })} />
                Permanente
              </label>
              {!punishForm.permanent && (
                <Input label="Dias" type="number" value={punishForm.durationDays} onChange={(e) => setPunishForm({ ...punishForm, durationDays: e.target.value })} />
              )}
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                confirm={confirmPresets.applyPunishment(punishmentTypeLabel(punishForm.type), user.nickname)}
                onClick={applyPunishment}
              >
                Aplicar
              </Button>
            </div>
            <div>
              <h3 className="font-display font-bold">Histórico</h3>
              <ul className="mt-3 space-y-2">
                {user.punishments.length === 0 ? (
                  <li className="text-sm text-muted">Sem punições.</li>
                ) : (
                  user.punishments.map((p) => (
                    <li key={p.id} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("font-semibold", p.type === "BAN" && "text-rose-400")}>
                          {punishmentTypeLabel(p.type)}
                        </span>
                        {p.active && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            confirm={confirmPresets.revokePunishment(punishmentTypeLabel(p.type))}
                            onClick={() => revokePunishment(p.id, p.type)}
                          >
                            Revogar
                          </Button>
                        )}
                      </div>
                      <p className="text-muted">{p.reason}</p>
                      {punishmentServerLabel(p.serverName) && (
                        <p className="mt-1 text-xs text-primary/80">
                          {punishmentServerLabel(p.serverName)}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        {p.admin.nickname} · {new Date(p.createdAt).toLocaleString("pt-BR")}
                        {p.expiresAt && ` · expira ${new Date(p.expiresAt).toLocaleDateString("pt-BR")}`}
                        {!p.active && " · revogada"}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
            </div>
          </div>
        )}

        {tab === "inventario" && (
          <div className="mt-6">
            <AdminUserInventoryPanel
              userId={userId}
              nickname={user.nickname}
              onSuccess={(msg) => {
                setFormError(null);
                setFormSuccess(msg);
              }}
              onError={(msg) => {
                setFormSuccess(null);
                setFormError(msg);
              }}
            />
          </div>
        )}

        {tab === "notificar" && (
          <div className="mt-6 max-w-lg space-y-4">
            <h3 className="flex items-center gap-2 font-display font-bold">
              <Bell className="h-4 w-4 text-primary" />
              Enviar notificação
            </h3>
            <Input label="Título" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Mensagem</label>
              <textarea
                value={notifyForm.body}
                rows={4}
                onChange={(e) => setNotifyForm({ ...notifyForm, body: e.target.value })}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
              />
            </div>
            <Button type="button" disabled={saving} onClick={sendNotification}>
              {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
