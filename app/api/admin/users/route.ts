import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminUsers } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const plan = request.nextUrl.searchParams.get("plan") ?? undefined;
  const isAdminParam = request.nextUrl.searchParams.get("isAdmin");
  const bannedParam = request.nextUrl.searchParams.get("banned");
  const isAdmin = isAdminParam === "true" ? true : undefined;
  const banned = bannedParam === "true" ? true : undefined;

  const result = await listAdminUsers({
    q,
    page,
    limit,
    plan,
    isAdmin,
    banned,
  });
  return NextResponse.json(result);
}
