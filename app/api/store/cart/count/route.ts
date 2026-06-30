import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getCartItemCount } from "@/lib/store/cart-service";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ count: 0 });
  }

  const count = await getCartItemCount(userId);
  return NextResponse.json({ count });
}
