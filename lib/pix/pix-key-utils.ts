export type PixKeyType = "PHONE" | "EMAIL" | "CPF" | "CNPJ" | "RANDOM";

export const PIX_KEY_TYPES: PixKeyType[] = ["CPF", "CNPJ", "PHONE", "EMAIL", "RANDOM"];

export type PixValidationErrorKey =
  | "invalidEmail"
  | "invalidPhone"
  | "invalidCpf"
  | "invalidCnpj"
  | "invalidRandom";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Celular BR: DDD + número (10 ou 11 dígitos), sem código do país. */
export function normalizeBrazilPhone(raw: string): string {
  let digits = digitsOnly(raw);
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

export function formatBrazilPhone(raw: string): string {
  const digits = normalizeBrazilPhone(raw);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function validateBrazilPhone(raw: string): PixValidationErrorKey | null {
  const len = normalizeBrazilPhone(raw).length;
  return len >= 10 && len <= 11 ? null : "invalidPhone";
}

export function detectPixKeyType(raw: string): PixKeyType {
  const trimmed = raw.trim();
  if (!trimmed) return "RANDOM";

  if (EMAIL_RE.test(trimmed)) return "EMAIL";
  if (UUID_RE.test(trimmed)) return "RANDOM";

  const digits = digitsOnly(trimmed);
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 11 && !looksLikeBrazilPhone(digits)) return "CPF";
  if (digits.length >= 10 && digits.length <= 11) return "PHONE";

  return "RANDOM";
}

function looksLikeBrazilPhone(digits: string): boolean {
  if (digits.length !== 11) return false;
  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  return digits[2] === "9";
}

export function formatPixKeyInput(type: PixKeyType, raw: string): string {
  const trimmed = raw.trim();

  switch (type) {
    case "EMAIL":
      return trimmed.toLowerCase().slice(0, 140);
    case "RANDOM":
      return trimmed.replace(/\s/g, "").slice(0, 140);
    case "PHONE":
      return formatBrazilPhone(trimmed);
    case "CPF": {
      const d = digitsOnly(trimmed).slice(0, 11);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
      if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    }
    case "CNPJ": {
      const d = digitsOnly(trimmed).slice(0, 14);
      if (d.length <= 2) return d;
      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
      if (d.length <= 12) {
        return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
      }
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function normalizePixKey(type: PixKeyType, raw: string): string {
  const trimmed = raw.trim();
  switch (type) {
    case "EMAIL":
      return trimmed.toLowerCase();
    case "PHONE":
      return normalizeBrazilPhone(trimmed);
    case "CPF":
    case "CNPJ":
      return digitsOnly(trimmed);
    case "RANDOM":
      return trimmed.replace(/\s/g, "");
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function maskPixKey(type: PixKeyType, normalized: string): string {
  if (!normalized) return "";

  switch (type) {
    case "EMAIL": {
      const [user, domain] = normalized.split("@");
      if (!user || !domain) return "•••@•••";
      const visible = user.slice(0, Math.min(2, user.length));
      return `${visible}${"•".repeat(Math.max(2, user.length - visible.length))}@${domain}`;
    }
    case "PHONE": {
      const d = normalizeBrazilPhone(normalized);
      if (d.length < 4) return "••••";
      return `(••) •••••-${d.slice(-4)}`;
    }
    case "CPF":
      return `•••.•••.•••-${normalized.slice(-2)}`;
    case "CNPJ":
      return `••.•••.•••/••••-${normalized.slice(-2)}`;
    case "RANDOM":
      if (normalized.length <= 8) return "••••••••";
      return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function validatePixKey(type: PixKeyType, raw: string): PixValidationErrorKey | null {
  const normalized = normalizePixKey(type, raw);

  switch (type) {
    case "EMAIL":
      return EMAIL_RE.test(normalized) ? null : "invalidEmail";
    case "PHONE":
      return validateBrazilPhone(raw);
    case "CPF":
      return digitsOnly(normalized).length === 11 ? null : "invalidCpf";
    case "CNPJ":
      return digitsOnly(normalized).length === 14 ? null : "invalidCnpj";
    case "RANDOM":
      return normalized.length >= 8 && normalized.length <= 140 ? null : "invalidRandom";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function parsePixKeyType(value: string | null | undefined): PixKeyType {
  if (value === "PHONE" || value === "EMAIL" || value === "CPF" || value === "CNPJ" || value === "RANDOM") {
    return value;
  }
  return "RANDOM";
}
