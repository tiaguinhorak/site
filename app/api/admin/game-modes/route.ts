import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminGameModeCreateSchema } from "@/lib/admin/schemas";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const modes = await prisma.gameMode.findMany({
    orderBy: { sortOrder: "asc" },
    include: { rooms: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ modes });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-game-mode-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminGameModeCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const slugTaken = await prisma.gameMode.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (slugTaken) {
    return jsonError(409, "Slug já em uso.");
  }

  const mode = await prisma.gameMode.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      accent: parsed.data.accent,
      tagline: parsed.data.tagline ?? "",
      description: parsed.data.description ?? "",
      iconKey: parsed.data.iconKey ?? "Crosshair",
      sortOrder: parsed.data.sortOrder,
    },
    include: { rooms: true },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_MODE_CREATE",
    targetType: "game_mode",
    targetId: mode.id,
    summary: `Criou modo: ${mode.name}`,
  });

  return NextResponse.json({ ok: true, mode });
}
