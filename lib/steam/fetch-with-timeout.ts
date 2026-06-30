const DEFAULT_TIMEOUT_MS = 12_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const signal =
    init.signal ??
    (typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutMs)
      : undefined);

  if (signal) {
    return fetch(url, { ...init, signal });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function probeOutboundUrl(
  url: string,
  timeoutMs = 5_000,
): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  try {
    const response = await fetchWithTimeout(
      url,
      { method: "GET", next: { revalidate: 0 } },
      timeoutMs,
    );
    return { ok: response.ok || response.status < 500, status: response.status, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: null, error: message };
  }
}
