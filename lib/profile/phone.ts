import { sanitizePhoneDigits } from "@/lib/security/sanitize";
import { getCountry } from "@/lib/profile/countries";

export function dialDigits(dial: string): string {
  return dial.replace(/\D/g, "");
}

export function extractNationalDigits(
  phone: string,
  countryCode: string,
): string {
  const country = getCountry(countryCode);
  const allDigits = sanitizePhoneDigits(phone);
  if (!country || !allDigits) return allDigits;

  const dial = dialDigits(country.dial);
  if (allDigits.startsWith(dial)) {
    return allDigits.slice(dial.length);
  }

  return allDigits;
}

export function formatNationalNumber(
  digits: string,
  countryCode: string,
): string {
  if (!digits) return "";

  if (countryCode === "BR") {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  if (countryCode === "US" || countryCode === "CA") {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

export function buildPhoneValue(
  nationalDigits: string,
  countryCode: string,
): string {
  const country = getCountry(countryCode);
  if (!country || !nationalDigits) return "";
  const formatted = formatNationalNumber(nationalDigits, countryCode);
  return `${country.dial} ${formatted}`.trim();
}

export function getPhonePlaceholder(countryCode: string): string {
  switch (countryCode) {
    case "BR":
      return "(11) 98765-4321";
    case "US":
    case "CA":
      return "(555) 123-4567";
    case "PT":
      return "912 345 678";
    case "AR":
      return "11 2345-6789";
    default:
      return "999 999 999";
  }
}

export function maxNationalDigits(countryCode: string): number {
  switch (countryCode) {
    case "BR":
      return 11;
    case "US":
    case "CA":
      return 10;
    default:
      return 12;
  }
}
