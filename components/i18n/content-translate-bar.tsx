"use client";

import { useState } from "react";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import { localeLabel } from "@/lib/i18n/article-content";
import { secureApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type ArticleBundle = { title: string; excerpt: string; body: string };

type Props = {
  contentLocale: Locale;
  displayed: ArticleBundle;
  source: ArticleBundle;
  className?: string;
  onTranslated?: (bundle: ArticleBundle) => void;
};

export function ContentTranslateBar({
  contentLocale,
  displayed,
  source,
  className,
  onTranslated,
}: Props) {
  const userLocale = useLocale() as Locale;
  const t = useTranslations("contentTranslate");
  const [mode, setMode] = useState<"original" | "translated">("original");
  const [translated, setTranslated] = useState<ArticleBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsTranslation = contentLocale !== userLocale;

  if (!needsTranslation) return null;

  async function handleTranslate() {
    setLoading(true);
    setError(null);
    const result = await secureApi<{
      ok: boolean;
      translation: ArticleBundle;
    }>("/api/content/translate", {
      method: "POST",
      json: {
        title: source.title,
        excerpt: source.excerpt,
        body: source.body,
        source: contentLocale,
      },
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTranslated(result.data.translation);
    setMode("translated");
    onTranslated?.(result.data.translation);
  }

  function showOriginal() {
    setMode("original");
    onTranslated?.(displayed);
  }

  function showTranslated() {
    if (!translated) {
      void handleTranslate();
      return;
    }
    setMode("translated");
    onTranslated?.(translated);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 glass-chip px-3 py-2",
        className,
      )}
    >
      <span className="text-xs text-muted">
        {t("shownIn", { lang: localeLabel(contentLocale) })}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {translated ? (
          <>
            <button
              type="button"
              onClick={showOriginal}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                mode === "original"
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t("original")}
            </button>
            <button
              type="button"
              onClick={showTranslated}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                mode === "translated"
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t("translated", { lang: localeLabel(userLocale) })}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleTranslate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Languages className="h-3.5 w-3.5" />
            )}
            {t("translateTo", { lang: localeLabel(userLocale) })}
          </button>
        )}
        {translated && mode === "translated" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleTranslate()}
            className="rounded-lg p-1 text-muted hover:text-foreground"
            aria-label={t("retranslate")}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-400" role="alert">{error}</p>
      )}
    </div>
  );
}
