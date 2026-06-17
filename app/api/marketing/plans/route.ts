import { NextResponse } from "next/server";
import { getSubscriptionPlans } from "@/lib/queries";

export async function GET() {
  const plans = await getSubscriptionPlans();
  return NextResponse.json({ plans });
}
