import { API_REQUEST_HEADER } from "@/lib/brand";

type ApiErrorBody = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function secureApi<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set(API_REQUEST_HEADER, "1");

  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("ngrok")
  ) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    return {
      ok: false,
      error: body.error ?? "Erro inesperado. Tente novamente.",
      fieldErrors: body.fieldErrors,
    };
  }

  return { ok: true, data: body };
}
