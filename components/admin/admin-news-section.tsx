"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Eye,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { DEFAULT_GRADIENT } from "@/lib/admin/content-presets";
import { GradientPicker } from "@/components/admin/pickers/gradient-picker";
import { CategoryPicker } from "@/components/admin/pickers/category-picker";
import { ImagePicker } from "@/components/admin/pickers/image-picker";
import {
  NewsPreviewCard,
  NewsPreviewDetail,
  NewsPreviewLocaleTabs,
  type PreviewLocale,
} from "@/components/admin/news-preview";
import { slugifyTitle, resolveArticleSlug } from "@/lib/i18n-content";
import { cn } from "@/lib/utils";

type ArticleTranslations = {
  en?: { title?: string; excerpt?: string; body?: string };
  es?: { title?: string; excerpt?: string; body?: string };
};

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  imageAccent: string;
  imageUrl: string | null;
  featured: boolean;
  publishedAt: string;
  archivedAt: string | null;
  translations?: ArticleTranslations | null;
  author?: { nickname: string } | null;
};

type TranslationFields = {
  title: string;
  excerpt: string;
  body: string;
};

function createEmptyForm() {
  return {
    title: "",
    excerpt: "",
    body: "",
    slug: "",
    category: "Atualização",
    imageAccent: DEFAULT_GRADIENT.classes,
    imageUrl: "",
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 16),
  };
}

type ListFilter = "active" | "archived";

function parseTranslations(raw: unknown): ArticleTranslations | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ArticleTranslations;
}

function formatPublishedLabel(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminNewsSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>("active");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>("pt-BR");
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [previewTranslations, setPreviewTranslations] = useState<{
    en?: TranslationFields;
    es?: TranslationFields;
  }>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const status = listFilter === "archived" ? "archived" : "active";
    fetch(`/api/admin/news?status=${status}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setArticles(data.articles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(createEmptyForm());
    setPreviewTranslations({});
    setPreviewLocale("pt-BR");
    setError(null);
  }

  function openEdit(article: Article) {
    const tr = parseTranslations(article.translations);
    setEditing(article);
    setForm({
      title: article.title,
      excerpt: article.excerpt,
      body: article.body ?? "",
      slug: article.slug,
      category: article.category,
      imageAccent: article.imageAccent,
      imageUrl: article.imageUrl ?? "",
      featured: article.featured,
      publishedAt: new Date(article.publishedAt).toISOString().slice(0, 16),
    });
    setPreviewTranslations({
      en: tr?.en
        ? {
            title: tr.en.title ?? "",
            excerpt: tr.en.excerpt ?? "",
            body: tr.en.body ?? "",
          }
        : undefined,
      es: tr?.es
        ? {
            title: tr.es.title ?? "",
            excerpt: tr.es.excerpt ?? "",
            body: tr.es.body ?? "",
          }
        : undefined,
    });
    setPreviewLocale("pt-BR");
    setError(null);
  }

  const ensurePreviewTranslation = useCallback(
    async (target: "en" | "es") => {
      if (!form.title.trim()) return;
      if (previewTranslations[target]?.title) return;

      setPreviewLoading(true);
      const result = await secureApi<{
        translation: { title: string; excerpt: string; body: string };
      }>("/api/admin/translate", {
        method: "POST",
        json: {
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          target,
          source: "pt-BR",
        },
      });
      setPreviewLoading(false);

      if (result.ok) {
        setPreviewTranslations((prev) => ({
          ...prev,
          [target]: result.data.translation,
        }));
      }
    },
    [form.title, form.excerpt, form.body, previewTranslations],
  );

  useEffect(() => {
    if (previewLocale === "en" || previewLocale === "es") {
      void ensurePreviewTranslation(previewLocale);
    }
  }, [previewLocale, ensurePreviewTranslation]);

  const previewContent = useMemo(() => {
    const publishedLabel = formatPublishedLabel(form.publishedAt);
    const base = {
      category: form.category,
      imageAccent: form.imageAccent,
      imageUrl: form.imageUrl || null,
      featured: form.featured,
      authorNickname: editing?.author?.nickname ?? "Admin",
      publishedLabel,
    };

    if (previewLocale === "pt-BR") {
      return {
        ...base,
        title: form.title,
        excerpt: form.excerpt,
        body: form.body,
      };
    }

    const tr =
      previewLocale === "en"
        ? previewTranslations.en
        : previewLocale === "es"
          ? previewTranslations.es
          : undefined;
    return {
      ...base,
      title: tr?.title ?? form.title,
      excerpt: tr?.excerpt ?? form.excerpt,
      body: tr?.body ?? form.body,
    };
  }, [form, previewLocale, previewTranslations, editing?.author?.nickname]);

  async function save() {
    setSaving(true);
    setError(null);

    const slug = resolveArticleSlug(
      form.slug,
      form.title,
      editing?.id?.slice(-8) ?? crypto.randomUUID().slice(0, 8),
    );

    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      body: form.body,
      slug,
      category: form.category,
      imageAccent: form.imageAccent,
      imageUrl: form.imageUrl || null,
      featured: form.featured,
      publishedAt: new Date(form.publishedAt).toISOString(),
    };

    const result = editing
      ? await secureApi(`/api/admin/news/${editing.id}`, { method: "PATCH", json: payload })
      : await secureApi("/api/admin/news", { method: "POST", json: payload });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    openCreate();
    load();
  }

  async function remove(id: string) {
    const result = await secureApi(`/api/admin/news/${id}`, { method: "DELETE" });
    if (result.ok) {
      if (editing?.id === id) openCreate();
      load();
    }
  }

  async function setArchived(id: string, archived: boolean) {
    const result = await secureApi(`/api/admin/news/${id}`, {
      method: "PATCH",
      json: { archived },
    });
    if (result.ok) {
      if (editing?.id === id && archived) openCreate();
      load();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={listFilter === "active" ? "primary" : "outline"}
            onClick={() => setListFilter("active")}
          >
            Publicados
          </Button>
          <Button
            type="button"
            size="sm"
            variant={listFilter === "archived" ? "primary" : "outline"}
            onClick={() => setListFilter("archived")}
          >
            Arquivados
          </Button>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo post
        </Button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-card glass-strong p-6 space-y-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              {editing ? (
                <Pencil className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
              {editing ? "Editar publicação" : "Nova publicação"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Conteúdo em português. EN e ES são traduzidos automaticamente ao publicar.
            </p>
          </div>

          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Slug (URL)"
            value={form.slug}
            placeholder={
              form.title.trim() ? slugifyTitle(form.title) : "minha-noticia"
            }
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Resumo
            </label>
            <textarea
              value={form.excerpt}
              rows={3}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Conteúdo
            </label>
            <textarea
              value={form.body}
              rows={8}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm font-mono leading-relaxed"
              placeholder="Texto completo da notícia..."
            />
          </div>

          <CategoryPicker
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
          />

          <ImagePicker
            value={form.imageUrl}
            onChange={(imageUrl) => setForm({ ...form, imageUrl })}
            folder="news"
          />

          {!form.imageUrl && (
            <GradientPicker
              value={form.imageAccent}
              onChange={(imageAccent) => setForm({ ...form, imageAccent })}
              label="Gradiente de capa (sem foto)"
            />
          )}

          <Input
            label="Data de publicação"
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="accent-[var(--primary)]"
            />
            Destaque na central
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" className="flex-1" disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-5 w-5 motion-safe-spin" /> : "Publicar"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={openCreate}>
                Cancelar
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-card glass-strong p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Eye className="h-5 w-5 text-primary" />
              Preview
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={previewMode === "card" ? "primary" : "outline"}
                onClick={() => setPreviewMode("card")}
              >
                Card
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewMode === "detail" ? "primary" : "outline"}
                onClick={() => setPreviewMode("detail")}
              >
                Artigo
              </Button>
            </div>
          </div>

          <NewsPreviewLocaleTabs locale={previewLocale} onLocaleChange={setPreviewLocale} />

          {previewLoading && previewLocale !== "pt-BR" ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <Loader2 className="h-6 w-6 motion-safe-spin text-primary" />
            </div>
          ) : previewMode === "card" ? (
            <NewsPreviewCard locale={previewLocale} content={previewContent} />
          ) : (
            <NewsPreviewDetail locale={previewLocale} content={previewContent} />
          )}

          {previewLocale !== "pt-BR" && (
            <p className="text-xs text-muted">
              Preview traduzido para visualização. A versão final é salva automaticamente na
              publicação.
            </p>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Newspaper className="h-5 w-5 text-primary" />
          {listFilter === "archived" ? "Arquivados" : "Publicados"} ({articles.length})
        </h2>

        {loading ? (
          <p className="py-12 text-center text-muted">Carregando...</p>
        ) : articles.length === 0 ? (
          <p className="rounded-card glass-strong py-12 text-center text-muted">
            {listFilter === "archived"
              ? "Nenhum post arquivado."
              : "Nenhum post publicado ainda."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="flex flex-col overflow-hidden rounded-card border border-border glass-strong"
              >
                <div className="relative h-32 overflow-hidden">
                  {article.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn("h-full w-full bg-gradient-to-br", article.imageAccent)}
                    />
                  )}
                  {article.featured && (
                    <span className="absolute right-2 top-2 rounded-lg bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Destaque
                    </span>
                  )}
                  {article.archivedAt && (
                    <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Arquivado
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="font-semibold leading-snug line-clamp-2">{article.title}</p>
                  <p className="mt-2 text-sm text-muted line-clamp-2">{article.excerpt}</p>
                  <p className="mt-3 text-xs text-muted">
                    {article.category} · {formatPublishedLabel(article.publishedAt)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted/80 truncate">/{article.slug}</p>

                  <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(article)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    {article.archivedAt ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchived(article.id, false)}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Restaurar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchived(article.id, true)}
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      confirm={confirmPresets.deleteAction(article.title)}
                      onClick={() => remove(article.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                    {article.featured && (
                      <Star className="ml-auto h-4 w-4 text-amber-400" aria-hidden />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
