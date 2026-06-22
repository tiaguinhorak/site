import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { csgoError, csgoJson } from "@/lib/csgo-api/http";

export async function parseCsgoBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: csgoError("JSON inválido.") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: csgoError(parsed.error.issues[0]?.message ?? "Dados inválidos.") };
  }
  return { data: parsed.data };
}

export { csgoJson, csgoError };
