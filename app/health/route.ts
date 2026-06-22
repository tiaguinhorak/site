import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCsgoBackendHealth } from "@/lib/csgo-api/client";
import { csgoError, csgoJson } from "@/lib/csgo-api/http";

/** Status do site + backend CS:GO (proxy). */
export async function GET() {
  try {
    const csgo = await getCsgoBackendHealth();
    return csgoJson({
      status: "ok",
      site: "clutchclube",
      csgoBackend: csgo,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backend CS:GO indisponível";
    return csgoJson(
      {
        status: "degraded",
        site: "clutchclube",
        csgoBackend: null,
        error: message,
        timestamp: new Date().toISOString(),
      },
      503,
    );
  }
}
