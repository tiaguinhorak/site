"use client";

import { useEffect, useState } from "react";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { DEFAULT_GRADIENT } from "@/lib/admin/content-presets";
import { GradientPicker } from "@/components/admin/pickers/gradient-picker";
import { CategoryPicker } from "@/components/admin/pickers/category-picker";
import { ImagePicker } from "@/components/admin/pickers/image-picker";
import { cn } from "@/lib/utils";

type Article = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  imageAccent: string;
  imageUrl: string | null;
  featured: boolean;
  publishedAt: string;
};

const emptyForm = {
  title: "",
  excerpt: "",
  category: "Atualização",
  imageAccent: DEFAULT_GRADIENT.classes,
  imageUrl: "",
  featured: false,
  publishedAt: new Date().toISOString().slice(0, 16),
};

export function AdminNewsSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/news", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setArticles(data.articles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
  }

  function openEdit(article: Article) {
    setEditing(article);
    setForm({
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      imageAccent: article.imageAccent,
      imageUrl: article.imageUrl ?? "",
      featured: article.featured,
      publishedAt: new Date(article.publishedAt).toISOString().slice(0, 16),
    });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
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

  async function remove(id: string, title: string) {
    const result = await secureApi(`/api/admin/news/${id}`, { method: "DELETE" });
    if (result.ok) load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <section className="rounded-card glass-strong p-6 lg:col-span-2 space-y-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          {editing ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
          {editing ? "Editar post" : "Novo post"}
        </h2>

        <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Resumo</label>
          <textarea
            value={form.excerpt}
            rows={3}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm"
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
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publicar"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={openCreate}>Cancelar</Button>
          )}
        </div>
      </section>

      <section className="rounded-card glass-strong p-6 lg:col-span-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Newspaper className="h-5 w-5 text-primary" />
          Posts ({articles.length})
        </h2>
        {loading ? (
          <p className="mt-6 text-center text-muted">Carregando...</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {articles.map((a) => (
              <li key={a.id} className="flex gap-4 py-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border">
                  {a.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className={cn("h-full w-full bg-gradient-to-br", a.imageAccent)} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{a.title}</p>
                    {a.featured && <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                  </div>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{a.excerpt}</p>
                  <p className="mt-1 text-xs text-muted">
                    {a.category} · {new Date(a.publishedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    confirm={confirmPresets.deleteAction(a.title)}
                    onClick={() => remove(a.id, a.title)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
