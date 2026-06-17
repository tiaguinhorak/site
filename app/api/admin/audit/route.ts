import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminAuditLogs } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "30");
  const result = await listAdminAuditLogs({ page, limit });
  return NextResponse.json(result);
}
