"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { countries, type CountryOption } from "@/lib/profile/countries";
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
  label = "País",
  id = "country-picker",
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = countries.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [query]);

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
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-[color-mix(in_srgb,var(--background-soft)_70%,transparent)] px-4 text-sm text-foreground outline-none transition-all",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
          error && "border-rose-500/60",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-lg leading-none">{selected?.flag ?? "🌐"}</span>
          <span>{selected?.name ?? "Selecione o país"}</span>
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
                placeholder="Buscar país..."
                className="h-10 w-full rounded-lg border border-border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>
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
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-xs text-muted">{country.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                Nenhum país encontrado
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
