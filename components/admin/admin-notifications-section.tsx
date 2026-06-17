"use client";

import { useEffect, useState } from "react";
import { Bell, Send, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  user: { id: string; nickname: string; email: string | null };
};

const TYPES = ["SYSTEM", "MATCH", "SOCIAL", "PROMO"] as const;

export function AdminNotificationsSection() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>("SYSTEM");
  const [userId, setUserId] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  function loadHistory() {
    fetch("/api/admin/notifications?limit=15", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setHistory(data.notifications);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function send() {
    setError(null);
    setMessage(null);
    if (!title.trim() || !body.trim()) {
      setError("Preencha título e mensagem.");
      return;
    }
    if (!broadcast && !userId.trim()) {
      setError("Informe o ID do usuário ou marque broadcast.");
      return;
    }

    setSending(true);
    const result = await secureApi<{ ok: boolean; sent?: number }>(
      "/api/admin/notifications",
      {
        method: "POST",
        json: {
          title,
          body,
          type,
          userId: broadcast ? undefined : userId.trim(),
          broadcast,
        },
      },
    );
    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage(
      broadcast
        ? `Broadcast enviado a ${result.data?.sent ?? 0} usuários.`
        : "Notificação enviada.",
    );
    setTitle("");
    setBody("");
    setUserId("");
    loadHistory();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <section className="rounded-card glass-strong p-6 lg:col-span-2 space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Send className="h-5 w-5 text-primary" />
          Enviar notificação
        </h2>

        <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={broadcast}
            onChange={(e) => setBroadcast(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Broadcast global
            </span>
            <span className="text-xs text-muted">
              Todos com perfil completo recebem
            </span>
          </span>
        </label>

        {!broadcast && (
          <Input
            label="ID do usuário"
            placeholder="cuid do usuário"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <Input
          label="Título"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Mensagem
          </label>
          <textarea
            value={body}
            maxLength={500}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm resize-y min-h-[100px]"
          />
        </div>

        {error && (
          <p className="text-sm text-rose-400" role="alert">{error}</p>
        )}
        {message && (
          <p className="text-sm text-emerald-400" role="status">{message}</p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={sending}
          confirm={broadcast ? confirmPresets.broadcastNotification : undefined}
          onClick={send}
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar
            </>
          )}
        </Button>
      </section>

      <section className="rounded-card glass-strong p-6 lg:col-span-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Bell className="h-5 w-5 text-primary" />
          Histórico recente
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {loading ? (
            <li className="py-8 text-center text-muted">Carregando...</li>
          ) : history.length === 0 ? (
            <li className="py-8 text-center text-muted">Sem notificações.</li>
          ) : (
            history.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      Para {n.user.nickname}
                      {n.user.email && ` · ${n.user.email}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      n.type === "PROMO"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {n.type}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
