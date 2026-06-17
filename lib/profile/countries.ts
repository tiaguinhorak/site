export type CountryOption = {
  code: string;
  name: string;
  flag: string;
  dial: string;
};

/** ISO 3166-1 alpha-2 — países mais comuns na comunidade CS + principais globais */
export const countries: CountryOption[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", dial: "+55" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾", dial: "+598" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴", dial: "+57" },
  { code: "PE", name: "Peru", flag: "🇵🇪", dial: "+51" },
  { code: "MX", name: "México", flag: "🇲🇽", dial: "+52" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "+1" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", dial: "+1" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", dial: "+34" },
  { code: "FR", name: "França", flag: "🇫🇷", dial: "+33" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", dial: "+49" },
  { code: "IT", name: "Itália", flag: "🇮🇹", dial: "+39" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dial: "+44" },
  { code: "NL", name: "Países Baixos", flag: "🇳🇱", dial: "+31" },
  { code: "PL", name: "Polônia", flag: "🇵🇱", dial: "+48" },
  { code: "SE", name: "Suécia", flag: "🇸🇪", dial: "+46" },
  { code: "NO", name: "Noruega", flag: "🇳🇴", dial: "+47" },
  { code: "DK", name: "Dinamarca", flag: "🇩🇰", dial: "+45" },
  { code: "FI", name: "Finlândia", flag: "🇫🇮", dial: "+358" },
  { code: "RU", name: "Rússia", flag: "🇷🇺", dial: "+7" },
  { code: "UA", name: "Ucrânia", flag: "🇺🇦", dial: "+380" },
  { code: "TR", name: "Turquia", flag: "🇹🇷", dial: "+90" },
  { code: "JP", name: "Japão", flag: "🇯🇵", dial: "+81" },
  { code: "KR", name: "Coreia do Sul", flag: "🇰🇷", dial: "+82" },
  { code: "CN", name: "China", flag: "🇨🇳", dial: "+86" },
  { code: "IN", name: "Índia", flag: "🇮🇳", dial: "+91" },
  { code: "AU", name: "Austrália", flag: "🇦🇺", dial: "+61" },
  { code: "NZ", name: "Nova Zelândia", flag: "🇳🇿", dial: "+64" },
  { code: "ZA", name: "África do Sul", flag: "🇿🇦", dial: "+27" },
  { code: "IL", name: "Israel", flag: "🇮🇱", dial: "+972" },
  { code: "AE", name: "Emirados Árabes", flag: "🇦🇪", dial: "+971" },
  { code: "SA", name: "Arábia Saudita", flag: "🇸🇦", dial: "+966" },
  { code: "EG", name: "Egito", flag: "🇪🇬", dial: "+20" },
  { code: "RO", name: "Romênia", flag: "🇷🇴", dial: "+40" },
  { code: "HU", name: "Hungria", flag: "🇭🇺", dial: "+36" },
  { code: "CZ", name: "República Tcheca", flag: "🇨🇿", dial: "+420" },
  { code: "AT", name: "Áustria", flag: "🇦🇹", dial: "+43" },
  { code: "CH", name: "Suíça", flag: "🇨🇭", dial: "+41" },
  { code: "BE", name: "Bélgica", flag: "🇧🇪", dial: "+32" },
  { code: "IE", name: "Irlanda", flag: "🇮🇪", dial: "+353" },
  { code: "GR", name: "Grécia", flag: "🇬🇷", dial: "+30" },
  { code: "TH", name: "Tailândia", flag: "🇹🇭", dial: "+66" },
  { code: "VN", name: "Vietnã", flag: "🇻🇳", dial: "+84" },
  { code: "PH", name: "Filipinas", flag: "🇵🇭", dial: "+63" },
  { code: "MY", name: "Malásia", flag: "🇲🇾", dial: "+60" },
  { code: "SG", name: "Singapura", flag: "🇸🇬", dial: "+65" },
  { code: "ID", name: "Indonésia", flag: "🇮🇩", dial: "+62" },
];

export const countryCodes = countries.map((c) => c.code) as [string, ...string[]];

export function getCountry(code: string): CountryOption | undefined {
  return countries.find((c) => c.code === code);
}

export function getCountryFlag(code: string): string {
  return getCountry(code)?.flag ?? "🌐";
}

export function getCountryLabel(code: string): string {
  const c = getCountry(code);
  return c ? `${c.flag} ${c.name}` : code;
}
