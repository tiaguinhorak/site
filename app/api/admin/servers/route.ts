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
import {
  adminServerCreateSchema,
  adminServerUpdateSchema,
} from "@/lib/admin/schemas";
import { listAdminServers } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const servers = await listAdminServers();
  return NextResponse.json({ servers });
}

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "admin-server-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminServerCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const server = await prisma.publicServer.create({ data: parsed.data });

  await logAdminAction({
    adminId: admin!.id,
    action: "SERVER_CREATE",
    targetType: "server",
    targetId: server.id,
    summary: `Criou servidor ${server.name}`,
  });

  return NextResponse.json({ ok: true, server });
}
