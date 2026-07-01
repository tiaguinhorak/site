import type { Locale } from "@/lib/i18n";
import { getNamespace } from "@/lib/i18n/catalog";
import type { RankedSeasonPixPayoutStatus } from "@/lib/ranked/pix-prize";
import type { PixValidationErrorKey } from "@/lib/pix/pix-key-utils";

export function pixErrorMessage(locale: Locale, key: PixValidationErrorKey): string {
  const errors = getNamespace(locale, "pix").errors;
  return errors[key] ?? key;
}

export function pixPayoutStatusLabel(
  locale: Locale,
  status: RankedSeasonPixPayoutStatus,
): string {
  const labels = getNamespace(locale, "pix").payoutStatus;
  return labels[status] ?? status;
}

export function pixDescription(locale: Locale): string {
  return getNamespace(locale, "pix").description;
}
