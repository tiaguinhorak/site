import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCsgoApiKey } from "@/lib/csgo-api/config";

export { getCsgoApiKey } from "@/lib/csgo-api/config";

export function requireCsgoApiKey(request: NextRequest): NextResponse | null {
  const configuredKey = getCsgoApiKey();
  if (!configuredKey) return null;

  const key = request.headers.get("x-api-key");
  if (!key || key !== configuredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function csgoError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function csgoJson<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function withCsgoApi(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const authError = requireCsgoApiKey(request);
  if (authError) return authError;
  try {
    return await handler(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    const status =
      err instanceof CsgoApiError ? err.status : message.includes("não encontrad") ? 404 : 500;
    return csgoError(message, status);
  }
}

export class CsgoApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CsgoApiError";
  }
}

export function assertFound<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new CsgoApiError(`${label} não encontrado.`, 404);
  return value;
}
