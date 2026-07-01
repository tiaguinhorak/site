import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";

/** Registro por e-mail desativado — contas são criadas via Steam OpenID. */
export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "auth-register",
    RATE_LIMITS.auth.limit,
    RATE_LIMITS.auth.windowMs,
  );
  if (guardError) return guardError;

  return NextResponse.json(
    {
      error: "Crie sua conta entrando com Steam. Depois complete e-mail, telefone e senha.",
    },
    { status: 403 },
  );
}
