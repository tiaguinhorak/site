import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminStats } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
