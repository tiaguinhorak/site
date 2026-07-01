import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { updateAnticheatReviewCase } from "@/lib/anticheat/review-case-service";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "CLEARED", "CONFIRMED", "DISMISSED"]).optional(),
  adminNotes: z.string().max(2000).optional(),
  severity: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-var-ac-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const updated = await updateAnticheatReviewCase(id, admin!.id, parsed.data);

  await logAdminAction({
    adminId: admin!.id,
    action: "VAR_AC_CASE_UPDATE",
    targetType: "anticheat_review_case",
    targetId: id,
    summary: `Atualizou caso VAR AC → ${parsed.data.status ?? "notas"}`,
  });

  return NextResponse.json({ ok: true, case: updated });
}
