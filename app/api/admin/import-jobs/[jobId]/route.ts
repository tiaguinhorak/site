import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getCatalogImportJob } from "@/lib/admin/catalog-import-jobs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { jobId } = await context.params;
  const job = getCatalogImportJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  if (job.userId !== admin!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ job });
}
