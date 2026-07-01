import { NextResponse } from "next/server";
import { getSiteStats } from "@/lib/queries";
import { localizeSiteStats } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";

export async function GET() {
  const locale = await getRequestLocale();
  const stats = await localizeSiteStats(await getSiteStats(), locale);
  return NextResponse.json({ stats });
}
