import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSubscriptionPlans } from "@/lib/queries";
import { localizeSubscriptionPlans } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";

export async function GET(request: NextRequest) {
  const locale = await getRequestLocale(request);
  const plans = await localizeSubscriptionPlans(await getSubscriptionPlans(), locale);
  return NextResponse.json({ plans });
}
