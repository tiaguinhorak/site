/** Mascara Steam ID para exibição — mostra início e fim, oculta o centro */
export function maskSteamId(steamId: string): string {
  const id = steamId.trim();
  if (id.length <= 8) {
    return "*".repeat(id.length);
  }
  const start = id.slice(0, 4);
  const end = id.slice(-4);
  const hidden = id.length - 8;
  return `${start}${"*".repeat(hidden)}${end}`;
}

export function formatSteamLinkedAt(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
