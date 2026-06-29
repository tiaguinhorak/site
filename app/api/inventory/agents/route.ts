import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  getPlayerAgents,
  savePlayerAgentsForUser,
  clearPlayerAgent,
} from "@/lib/inventory/player-agents";
import {
  ensureLegacyAgentCatalogAndLoadouts,
  listEnabledAgentsForPicker,
} from "@/lib/inventory/agent-catalog-admin";
import { pushPlayerAgentsToGameServer } from "@/lib/inventory/push-agents-to-game-server";
import { getInventoryPlanLimitsCached } from "@/lib/inventory/plan-limits-cache";
import { getUserSteamIdCached } from "@/lib/inventory/user-steam-id-cache";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { getRequestLocale } from "@/lib/i18n/server";
import { jsonErrorKey, zodErrorResponse } from "@/lib/i18n/api-route";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

const saveSchema = z.object({
  team: z.enum(["T", "CT"]),
  defIndex: z.number().int().min(0),
});


export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const params = request.nextUrl.searchParams;
  const picker = params.get("picker") === "1";
  const search = params.get("search") ?? "";

  if (picker) {
    const page = Number(params.get("page") ?? "1");
    const limit = Number(params.get("limit") ?? "24");
    const teamParam = params.get("team");
    const team = teamParam === "T" || teamParam === "CT" ? teamParam : undefined;
    const result = await listEnabledAgentsForPicker({
      search,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 24,
      team,
    });
    return NextResponse.json(result);
  }

  const locale = await getRequestLocale(request);

  try {
    const [steamId, limits] = await Promise.all([
      getUserSteamIdCached(userId),
      getInventoryPlanLimitsCached(userId),
    ]);
    void ensureLegacyAgentCatalogAndLoadouts();
    const loadout = await getPlayerAgents(steamId);
    return NextResponse.json({
      ...loadout,
      canUseAgents: limits.canUseAgents,
    });
  } catch (err) {
    const message =
      err instanceof CsgoApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Falha ao carregar agentes.";
    return NextResponse.json({ error: message }, { status: err instanceof CsgoApiError ? err.status : 500 });
  }
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "inventory-agents-save",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = saveSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  const locale = await getRequestLocale(request);

  try {
    const { loadout, steamId } = await savePlayerAgentsForUser(
      userId,
      parsed.data.team as LoadoutTeam,
      parsed.data.defIndex,
    );

    void pushPlayerAgentsToGameServer(steamId);

    return NextResponse.json({
      ok: true,
      loadout,
      gameSync: { ok: true, applyMode: "staged" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao salvar agente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "inventory-agents-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const teamParam = request.nextUrl.searchParams.get("team");
  if (teamParam !== "T" && teamParam !== "CT") {
    return NextResponse.json({ error: "team inválido." }, { status: 400 });
  }

  try {
    const steamId = await getUserSteamIdCached(userId);
    const loadout = await clearPlayerAgent(steamId, teamParam);
    void pushPlayerAgentsToGameServer(steamId);
    return NextResponse.json({
      ok: true,
      loadout,
      gameSync: { ok: true, applyMode: "staged" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao remover agente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
