import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminPunishments } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const type = request.nextUrl.searchParams.get("type") ?? undefined;
  const activeParam = request.nextUrl.searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const result = await listAdminPunishments({ page, limit, type, active });
  return NextResponse.json(result);
}
