import type { Locale } from "@/lib/i18n";

const CATEGORY_KEYS: Record<string, string> = {
  atualização: "update",
  atualizacao: "update",
  update: "update",
  patch: "patch",
  evento: "event",
  event: "event",
  promoção: "promo",
  promocao: "promo",
  promo: "promo",
  manutenção: "maintenance",
  manutencao: "maintenance",
  maintenance: "maintenance",
};

const LABELS: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    update: "Atualização",
    patch: "Patch",
    event: "Evento",
    promo: "Promoção",
    maintenance: "Manutenção",
  },
  en: {
    update: "Update",
    patch: "Patch",
    event: "Event",
    promo: "Promotion",
    maintenance: "Maintenance",
  },
  es: {
    update: "Actualización",
    patch: "Parche",
    event: "Evento",
    promo: "Promoción",
    maintenance: "Mantenimiento",
  },
};

export function formatNewsCategory(category: string, locale: Locale): string {
  const normalized = category.trim().toLowerCase();
  const key = CATEGORY_KEYS[normalized];
  if (key && LABELS[locale][key]) return LABELS[locale][key];
  return category;
}
