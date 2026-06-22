export function formatConnectAddress(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  if (!host || !port) return null;
  return `${host}:${port}`;
}

export function formatConnectCommand(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  const address = formatConnectAddress(host, port);
  return address ? `connect ${address}` : null;
}

export function steamConnectUrl(
  host: string | null | undefined,
  port: number | null | undefined,
): string | null {
  const address = formatConnectAddress(host, port);
  return address ? `steam://connect/${address}` : null;
}
