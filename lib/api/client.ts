import { API_REQUEST_HEADER } from "@/lib/brand";

type ApiErrorBody = {
  error?: string;
  message?: string;
  warning?: string;
  orphanProcess?: boolean;
  fieldErrors?: Record<string, string>;
};

export async function secureApi<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      warning?: string;
      orphanProcess?: boolean;
      fieldErrors?: Record<string, string>;
    }
> {
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
    cache: "no-store",
    ...options,
    headers,
    credentials: "same-origin",
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    return {
      ok: false,
      error: body.error ?? body.message ?? "Erro inesperado. Tente novamente.",
      warning: body.warning,
      orphanProcess: body.orphanProcess,
      fieldErrors: body.fieldErrors,
    };
  }

  return { ok: true, data: body };
}

export async function secureFormApi<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> = {},
): Promise<
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      warning?: string;
      orphanProcess?: boolean;
      fieldErrors?: Record<string, string>;
    }
> {
  const headers = new Headers(options.headers);
  headers.set(API_REQUEST_HEADER, "1");

  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("ngrok")
  ) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers,
    credentials: "same-origin",
    body: formData,
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    return {
      ok: false,
      error: body.error ?? body.message ?? "Erro inesperado. Tente novamente.",
      warning: body.warning,
      orphanProcess: body.orphanProcess,
      fieldErrors: body.fieldErrors,
    };
  }

  return { ok: true, data: body };
}
