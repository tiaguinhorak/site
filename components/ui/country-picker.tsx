"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  countries,
  getCountry,
  popularCountryCodes,
  type CountryOption,
} from "@/lib/profile/countries";
import { getCountryDisplayName } from "@/lib/i18n/country-names";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CountryPickerProps = {
  value: string;
  onChange: (code: string) => void;
  error?: string;
  label?: string;
  id?: string;
};

export function CountryPicker({
  value,
  onChange,
  error,
  label,
  id = "country-picker",
}: CountryPickerProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("countryPicker");
  const resolvedLabel = label ?? t("label");

  function countryLabel(c: CountryOption) {
    return getCountryDisplayName(c.code, locale);
  }
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = countries.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        countryLabel(c).toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [query, locale]);

  const popular = useMemo(
    () =>
      popularCountryCodes
        .map((code) => getCountry(code))
        .filter((c): c is CountryOption => Boolean(c)),
    [],
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(country: CountryOption) {
    onChange(country.code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block font-display text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {resolvedLabel}
      </label>
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl glass-input px-4 text-sm text-foreground outline-none transition-all",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
          error && "border-rose-500/60",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-lg leading-none">{selected?.flag ?? "🌐"}</span>
          <span>{selected ? countryLabel(selected) : t("placeholder")}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-full min-w-[min(100%,280px)] overflow-hidden rounded-xl border border-border glass-menu shadow-xl"
          role="listbox"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="h-10 w-full rounded-lg glass-input pl-9 pr-3 text-sm outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>
          {!query.trim() && (
            <div className="border-b border-border p-2">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {t("popular")}
              </p>
              <ul className="flex flex-wrap gap-1">
                {popular.map((country) => (
                  <li key={`popular-${country.code}`}>
                    <button
                      type="button"
                      onClick={() => pick(country)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg glass-chip px-2 py-1 text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
                        country.code === value &&
                          "border-primary/40 bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
                      )}
                    >
                      <span>{country.flag}</span>
                      <span>{countryLabel(country)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="max-h-56 overflow-y-auto p-1">
            {filtered.map((country) => (
              <li key={country.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={country.code === value}
                  onClick={() => pick(country)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
                    country.code === value &&
                      "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
                  )}
                >
                  <span className="text-lg leading-none">{country.flag}</span>
                  <span className="flex-1 truncate">{countryLabel(country)}</span>
                  <span className="text-xs text-muted">{country.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {t("noResults")}
              </li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-rose-400" role="alert">{error}</p>
      )}
    </div>
  );
}
