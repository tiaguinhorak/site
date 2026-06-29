/** BRL currency mask helpers (digits = centavos). */

export function centsToDigitString(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return String(Math.round(cents));
}

export function digitsToCents(digits: string): number {
  const cleaned = digits.replace(/\D/g, "");
  if (!cleaned) return 0;
  const value = parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : 0;
}

export function formatDigitsAsBrl(digits: string): string {
  const cents = digitsToCents(digits);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function centsToBrlDisplay(cents: number): string {
  return formatDigitsAsBrl(centsToDigitString(cents));
}

export function parseBrlInputToCents(display: string): number {
  return digitsToCents(display);
}
