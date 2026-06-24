"use client";

import { useEffect, useState } from "react";
import { Bell, Send, Loader2, Users, Languages } from "lucide-react";
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

type TranslationFields = { title: string; body: string };

const emptyTranslations = (): { en: TranslationFields; es: TranslationFields } => ({
  en: { title: "", body: "" },
  es: { title: "", body: "" },
});

const TYPES = ["SYSTEM", "MATCH", "SOCIAL", "PROMO"] as const;

export function AdminNotificationsSection() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>("SYSTEM");
  const [userId, setUserId] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [autoTranslateOnSend, setAutoTranslateOnSend] = useState(true);
  const [translations, setTranslations] = useState(emptyTranslations());
  const [translating, setTranslating] = useState<"en" | "es" | "all" | null>(null);
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

  function buildManualTranslations() {
    const out: {
      en?: { title?: string; body?: string };
      es?: { title?: string; body?: string };
    } = {};
    if (translations.en.title || translations.en.body) {
      out.en = {
        title: translations.en.title || undefined,
        body: translations.en.body || undefined,
      };
    }
    if (translations.es.title || translations.es.body) {
      out.es = {
        title: translations.es.title || undefined,
        body: translations.es.body || undefined,
      };
    }
    return Object.keys(out).length ? out : null;
  }

  async function autoTranslate(target: "en" | "es" | "all") {
    if (!title.trim()) {
      setError("Preencha o título em português antes de traduzir.");
      return;
    }
    setTranslating(target);
    setError(null);
    const targets = target === "all" ? (["en", "es"] as const) : [target];

    try {
      for (const lang of targets) {
        const result = await secureApi<{
          ok: boolean;
          translation: { title: string; excerpt: string; body: string };
        }>("/api/admin/translate", {
          method: "POST",
          json: {
            title,
            excerpt: "",
            body,
            target: lang,
            source: "pt-BR",
          },
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const tr = result.data.translation;
        setTranslations((prev) => ({
          ...prev,
          [lang]: { title: tr.title, body: tr.body },
        }));
      }
    } finally {
      setTranslating(null);
    }
  }

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

    const manualTranslations = buildManualTranslations();
    const useAutoTranslate = autoTranslateOnSend && !manualTranslations;

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
          autoTranslate: useAutoTranslate,
          translations: manualTranslations,
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
    setTranslations(emptyTranslations());
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
          label="Título (PT)"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Mensagem (PT)
          </label>
          <textarea
            value={body}
            maxLength={500}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm resize-y min-h-[100px]"
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={autoTranslateOnSend}
            onChange={(e) => setAutoTranslateOnSend(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="font-medium text-foreground">Traduzir automaticamente ao enviar</span>
            <span className="block text-xs text-muted">
              Gera EN/ES no servidor se não houver traduções manuais
            </span>
          </span>
        </label>

        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Traduções (EN / ES)
          </summary>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={translating !== null}
                onClick={() => autoTranslate("en")}
              >
                {translating === "en" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                Traduzir EN
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={translating !== null}
                onClick={() => autoTranslate("es")}
              >
                {translating === "es" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                Traduzir ES
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={translating !== null}
                onClick={() => autoTranslate("all")}
              >
                {translating === "all" ? (
                  <Loader2 className="h-4 w-4 motion-safe-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                Traduzir todos
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">English</p>
                <Input
                  label="Título EN"
                  value={translations.en.title}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      en: { ...prev.en, title: e.target.value },
                    }))
                  }
                />
                <textarea
                  value={translations.en.body}
                  rows={3}
                  placeholder="Mensagem EN"
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      en: { ...prev.en, body: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Español</p>
                <Input
                  label="Título ES"
                  value={translations.es.title}
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      es: { ...prev.es, title: e.target.value },
                    }))
                  }
                />
                <textarea
                  value={translations.es.body}
                  rows={3}
                  placeholder="Mensagem ES"
                  onChange={(e) =>
                    setTranslations((prev) => ({
                      ...prev,
                      es: { ...prev.es, body: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </details>

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
            <Loader2 className="h-5 w-5 motion-safe-spin" />
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
