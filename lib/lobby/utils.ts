export function eloToLobbyLevel(elo: number): number {
  return Math.max(1, Math.min(20, Math.round(elo / 120)));
}

export function regionPingEstimate(region: string): number {
  const base: Record<string, number> = {
    BR: 18,
    AR: 32,
    UY: 28,
    CL: 45,
    CO: 38,
    PE: 42,
  };
  return base[region] ?? 35;
}
