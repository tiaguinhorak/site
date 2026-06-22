import { RARITY_I18N_FALLBACK } from "@/lib/inventory/rarity-tiers";

type IntlErrorLike = { code: string };

export function intlOnError(error: IntlErrorLike) {
  if (error.code === "MISSING_MESSAGE") return;
  console.error(error);
}

export function intlGetMessageFallback({
  namespace,
  key,
}: {
  namespace?: string;
  key: string;
}) {
  if (namespace === "inventory" && key in RARITY_I18N_FALLBACK) {
    return RARITY_I18N_FALLBACK[key];
  }
  return namespace ? `${namespace}.${key}` : key;
}
